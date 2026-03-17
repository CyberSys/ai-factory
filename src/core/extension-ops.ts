import path from 'path';
import type { AgentInstallation, AiFactoryConfig, ExtensionRecord } from './config.js';
import {
  type ExtensionManifest,
  classifyExtensionSource,
  compareExtensionVersions,
  getNpmVersionCheckResult,
  parseGitSource,
  resolveExtension,
  getExtensionsDir,
  loadExtensionManifest,
} from './extensions.js';
import { installSkills, getAvailableSkills, installExtensionSkills, removeExtensionSkills } from './installer.js';
import { applySingleExtensionInjections, stripAllExtensionInjections, stripInjectionsByExtensionName } from './injections.js';
import { configureExtensionMcpServers, validateMcpTemplate, type McpServerConfig } from './mcp.js';
import { readJsonFile } from '../utils/fs.js';

export interface ExtensionAssetInstallResult {
  replacedSkills: string[];
  replacementOutcomes: Array<{
    baseSkillName: string;
    extensionSkillPath: string;
    status: 'installed' | 'rolled-back' | 'preserved-base';
    successCount: number;
    agentCount: number;
  }>;
  customSkillInstalls: Map<string, string[]>;
  injectionCount: number;
  configuredMcpServers: string[];
}

/**
 * Install base skills on all agents.
 */
export async function installSkillsForAllAgents(
  projectDir: string,
  agents: AgentInstallation[],
  skills: string[],
): Promise<void> {
  for (const agent of agents) {
    await installSkills({ projectDir, skillsDir: agent.skillsDir, skills, agentId: agent.id });
  }
}

/**
 * Remove extension skills from all agents. Returns per-agent removed lists.
 */
export async function removeSkillsForAllAgents(
  projectDir: string,
  agents: AgentInstallation[],
  skillNames: string[],
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  for (const agent of agents) {
    const removed = await removeExtensionSkills(projectDir, agent, skillNames);
    results.set(agent.id, removed);
  }
  return results;
}

/**
 * Install extension skills on all agents. Returns per-agent installed lists.
 */
export async function installExtensionSkillsForAllAgents(
  projectDir: string,
  agents: AgentInstallation[],
  extensionDir: string,
  skillPaths: string[],
  nameOverrides?: Record<string, string>,
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  for (const agent of agents) {
    const installed = await installExtensionSkills(projectDir, agent, extensionDir, skillPaths, nameOverrides);
    results.set(agent.id, installed);
  }
  return results;
}

/**
 * Collect all replaced skills from extensions, optionally excluding one extension by name.
 */
export function collectReplacedSkills(extensions: ExtensionRecord[], excludeName?: string): Set<string> {
  const result = new Set<string>();
  for (const ext of extensions) {
    if (excludeName && ext.name === excludeName) continue;
    if (ext.replacedSkills?.length) {
      for (const s of ext.replacedSkills) result.add(s);
    }
  }
  return result;
}

/**
 * Ensure a new/updated extension does not claim a base skill already replaced by another extension.
 */
export function assertNoReplacementConflicts(
  extensions: ExtensionRecord[],
  manifest: ExtensionManifest,
  currentExtensionName?: string,
): void {
  if (!manifest.replaces) {
    return;
  }

  for (const [, baseSkillName] of Object.entries(manifest.replaces)) {
    for (const other of extensions) {
      if (other.name === currentExtensionName) continue;
      if (other.replacedSkills?.includes(baseSkillName)) {
        throw new Error(`Conflict: skill "${baseSkillName}" is already replaced by extension "${other.name}". Remove it first.`);
      }
    }
  }
}

/**
 * Restore base skills that were previously replaced, filtering out skills still replaced by other extensions.
 */
export async function restoreBaseSkills(
  projectDir: string,
  agents: AgentInstallation[],
  skillNames: string[],
  excludeStillReplaced: Set<string>,
): Promise<string[]> {
  const available = await getAvailableSkills();
  const toRestore = skillNames.filter(s => available.includes(s) && !excludeStillReplaced.has(s));
  if (toRestore.length > 0) {
    await installSkillsForAllAgents(projectDir, agents, toRestore);
  }
  return toRestore;
}

/**
 * Remove the previously installed state for an extension before reapplying its refreshed manifest.
 */
export async function removePreviousExtensionState(
  projectDir: string,
  agents: AgentInstallation[],
  extensionName: string,
  oldRecord?: ExtensionRecord | null,
  oldManifest?: ExtensionManifest | null,
): Promise<void> {
  await stripInjectionsForAllAgents(projectDir, agents, extensionName, oldManifest);

  if (oldRecord?.replacedSkills?.length) {
    await removeSkillsForAllAgents(projectDir, agents, oldRecord.replacedSkills);
    await restoreBaseSkills(projectDir, agents, oldRecord.replacedSkills, new Set());
  }

  if (oldManifest) {
    await removeCustomSkillsForAllAgents(projectDir, agents, oldManifest);
  }
}

/**
 * Strip extension injections from all agents. Uses manifest if available, falls back to name-based scan.
 */
export async function stripInjectionsForAllAgents(
  projectDir: string,
  agents: AgentInstallation[],
  extensionName: string,
  manifest?: ExtensionManifest | null,
): Promise<void> {
  for (const agent of agents) {
    if (manifest) {
      await stripAllExtensionInjections(projectDir, agent, extensionName, manifest);
    } else {
      await stripInjectionsByExtensionName(projectDir, agent, extensionName);
    }
  }
}

/**
 * Remove custom (non-replacement) skills from all agents based on the manifest.
 * Returns the list of custom skill paths that were targeted for removal.
 */
export async function removeCustomSkillsForAllAgents(
  projectDir: string,
  agents: AgentInstallation[],
  manifest: ExtensionManifest,
): Promise<Map<string, string[]>> {
  const replacesPaths = new Set(Object.keys(manifest.replaces ?? {}));
  const customSkills = (manifest.skills ?? []).filter(s => !replacesPaths.has(s));
  if (customSkills.length === 0) return new Map();
  return removeSkillsForAllAgents(projectDir, agents, customSkills);
}

/**
 * Install replacement skills, custom skills, injections, and MCP config for an extension.
 */
export async function installExtensionAssetsForAllAgents(
  projectDir: string,
  agents: AgentInstallation[],
  extensionDir: string,
  manifest: ExtensionManifest,
): Promise<ExtensionAssetInstallResult> {
  const replacedSkills: string[] = [];
  const replacementOutcomes: ExtensionAssetInstallResult['replacementOutcomes'] = [];
  const replacesPaths = new Set<string>();

  if (manifest.replaces && Object.keys(manifest.replaces).length > 0) {
    const nameOverrides: Record<string, string> = { ...manifest.replaces };
    const replacePaths = Object.keys(manifest.replaces);
    const perAgentResults = new Map<string, number>();

    for (const agent of agents) {
      const installed = await installExtensionSkills(projectDir, agent, extensionDir, replacePaths, nameOverrides);
      for (const name of installed) {
        perAgentResults.set(name, (perAgentResults.get(name) ?? 0) + 1);
      }
    }

    const agentCount = agents.length;
    for (const [extSkillPath, baseSkillName] of Object.entries(manifest.replaces)) {
      replacesPaths.add(extSkillPath);
      const successCount = perAgentResults.get(baseSkillName) ?? 0;

      if (successCount === agentCount) {
        replacedSkills.push(baseSkillName);
        replacementOutcomes.push({
          baseSkillName,
          extensionSkillPath: extSkillPath,
          status: 'installed',
          successCount,
          agentCount,
        });
        continue;
      }

      if (successCount > 0) {
        await removeSkillsForAllAgents(projectDir, agents, [baseSkillName]);
        await restoreBaseSkills(projectDir, agents, [baseSkillName], new Set());
        replacementOutcomes.push({
          baseSkillName,
          extensionSkillPath: extSkillPath,
          status: 'rolled-back',
          successCount,
          agentCount,
        });
        continue;
      }

      replacementOutcomes.push({
        baseSkillName,
        extensionSkillPath: extSkillPath,
        status: 'preserved-base',
        successCount,
        agentCount,
      });
    }
  }

  const customSkillInstalls = new Map<string, string[]>();
  if (manifest.skills?.length) {
    const nonReplacementSkills = manifest.skills.filter(skillPath => !replacesPaths.has(skillPath));
    if (nonReplacementSkills.length > 0) {
      const results = await installExtensionSkillsForAllAgents(projectDir, agents, extensionDir, nonReplacementSkills);
      for (const [agentId, installed] of results) {
        customSkillInstalls.set(agentId, installed);
      }
    }
  }

  let injectionCount = 0;
  if (manifest.injections?.length) {
    for (const agent of agents) {
      injectionCount += await applySingleExtensionInjections(projectDir, agent, extensionDir, manifest);
    }
  }

  const configuredMcpServers: string[] = [];
  if (manifest.mcpServers?.length) {
    for (const server of manifest.mcpServers) {
      let template: unknown;
      if (typeof server.template === 'string') {
        template = await readJsonFile<McpServerConfig>(path.join(extensionDir, server.template));
      } else {
        template = server.template;
      }

      if (!template) {
        continue;
      }

      validateMcpTemplate(template, server.key);

      for (const agent of agents) {
        const configured = await configureExtensionMcpServers(projectDir, agent.id, [
          { key: server.key, template },
        ]);
        if (configured.length > 0 && !configuredMcpServers.includes(server.key)) {
          configuredMcpServers.push(server.key);
        }
      }
    }
  }

  return {
    replacedSkills,
    replacementOutcomes,
    customSkillInstalls,
    injectionCount,
    configuredMcpServers,
  };
}

export interface ExtensionRefreshResult {
  name: string;
  status: 'updated' | 'unchanged' | 'failed' | 'skipped';
  oldVersion: string;
  newVersion: string | null;
  failureReason?: string;
}

export interface ExtensionRefreshSummary {
  updated: ExtensionRefreshResult[];
  unchanged: ExtensionRefreshResult[];
  failed: ExtensionRefreshResult[];
  skipped: ExtensionRefreshResult[];
}

async function checkExtensionNeedsRefresh(
  source: string,
  currentVersion: string,
  force: boolean,
): Promise<{ shouldRefresh: boolean; latestVersion: string | null; reason: string }> {
  const sourceType = classifyExtensionSource(source);

  if (force) {
    return { shouldRefresh: true, latestVersion: null, reason: 'force' };
  }

  if (sourceType === 'npm') {
    const packageName = source.replace(/^npm:/, '');
    const check = await getNpmVersionCheckResult(packageName, currentVersion, false);
    return {
      shouldRefresh: check.shouldDownload,
      latestVersion: check.latestVersion,
      reason: check.reason,
    };
  }

  if (sourceType === 'github') {
    const gitSource = parseGitSource(source);
    if (gitSource.isGitHub && gitSource.owner && gitSource.repo) {
      const token = process.env.GITHUB_TOKEN?.trim();
      const contentsUrl = new URL(
        `https://api.github.com/repos/${gitSource.owner}/${gitSource.repo}/contents/extension.json`,
      );
      if (gitSource.ref) {
        contentsUrl.searchParams.set('ref', gitSource.ref);
      }

      try {
        const response = await fetch(contentsUrl.toString(), {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          return { shouldRefresh: false, latestVersion: null, reason: 'rate-limited' };
        }

        if (response.ok) {
          const payload = (await response.json()) as { content?: string; encoding?: string };
          if (payload.encoding === 'base64' && payload.content) {
            const manifest = JSON.parse(
              Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString('utf8'),
            ) as ExtensionManifest;
            if (manifest.version) {
              const needsUpdate = compareExtensionVersions(manifest.version, currentVersion) > 0;
              return {
                shouldRefresh: needsUpdate,
                latestVersion: manifest.version,
                reason: needsUpdate ? 'version-changed' : 'unchanged',
              };
            }
          }
        }
      } catch {
        return { shouldRefresh: false, latestVersion: null, reason: 'github-api-failed' };
      }
    }
  }

  return { shouldRefresh: false, latestVersion: null, reason: 'source-type-requires-force' };
}

export async function refreshExtensions(
  projectDir: string,
  config: AiFactoryConfig,
  options?: {
    targetNames?: string[];
    force?: boolean;
    log?: (level: 'info' | 'warn', message: string) => void;
  },
): Promise<ExtensionRefreshSummary> {
  const force = options?.force ?? false;
  const log = options?.log ?? (() => {});
  const extensions = config.extensions ?? [];

  if (extensions.length === 0) {
    return { updated: [], unchanged: [], failed: [], skipped: [] };
  }

  const targetExtensions = options?.targetNames
    ? extensions.filter((e) => options.targetNames!.includes(e.name))
    : extensions;

  const results: ExtensionRefreshResult[] = [];

  for (const extRecord of targetExtensions) {
    const { name: extName, source, version: currentVersion } = extRecord;

    log('info', `Checking ${extName} (v${currentVersion})...`);

    const check = await checkExtensionNeedsRefresh(source, currentVersion, force);

    if (!check.shouldRefresh) {
      const status: ExtensionRefreshResult['status'] =
        check.reason === 'unchanged' ? 'unchanged' : 'skipped';
      results.push({
        name: extName,
        status,
        oldVersion: currentVersion,
        newVersion: check.latestVersion ?? currentVersion,
        failureReason: check.reason !== 'unchanged' ? check.reason : undefined,
      });
      continue;
    }

    log('info', `Refreshing ${extName} from ${source}...`);

    try {
      const resolved = await resolveExtension(projectDir, source);

      try {
        const manifest = resolved.manifest;
        const extensionsList = config.extensions ?? [];
        const existIdx = extensionsList.findIndex((ext) => ext.name === extName);
        const oldRecord = existIdx >= 0 ? { ...extensionsList[existIdx] } : null;
        const oldManifest = existIdx >= 0
          ? await loadExtensionManifest(path.join(getExtensionsDir(projectDir), extName))
          : null;

        assertNoReplacementConflicts(extensionsList, manifest, extName);

        const { commitExtensionInstall } = await import('./extensions.js');
        await commitExtensionInstall(projectDir, resolved);

        if (existIdx >= 0) {
          await removePreviousExtensionState(projectDir, config.agents, extName, oldRecord, oldManifest);
        }

        const extensionDir = path.join(getExtensionsDir(projectDir), manifest.name);
        const assetInstall = await installExtensionAssetsForAllAgents(
          projectDir,
          config.agents,
          extensionDir,
          manifest,
        );

        const record: ExtensionRecord = {
          name: manifest.name,
          source,
          version: manifest.version,
          replacedSkills: assetInstall.replacedSkills.length > 0 ? assetInstall.replacedSkills : undefined,
        };

        if (existIdx >= 0) {
          extensionsList[existIdx] = record;
        } else {
          extensionsList.push(record);
        }

        config.extensions = extensionsList;

        results.push({
          name: extName,
          status: 'updated',
          oldVersion: currentVersion,
          newVersion: manifest.version,
        });

        log('info', `Updated ${extName}: v${currentVersion} → v${manifest.version}`);
      } finally {
        await resolved.cleanup();
      }
    } catch (error) {
      const message = (error as Error).message;
      results.push({
        name: extName,
        status: 'failed',
        oldVersion: currentVersion,
        newVersion: null,
        failureReason: message,
      });
      log('warn', `Failed to refresh ${extName}: ${message}`);
    }
  }

  return {
    updated: results.filter((r) => r.status === 'updated'),
    unchanged: results.filter((r) => r.status === 'unchanged'),
    failed: results.filter((r) => r.status === 'failed'),
    skipped: results.filter((r) => r.status === 'skipped'),
  };
}
