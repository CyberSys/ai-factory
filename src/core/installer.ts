import path from 'path';
import { createHash } from 'crypto';
import { copyDirectory, getSkillsDir, ensureDir, listDirectories, listFilesRecursive, readTextFile, readFileBuffer, writeTextFile, removeDirectory, fileExists, hashDirectory } from '../utils/fs.js';
import type { AgentInstallation, ManagedSkillState } from './config.js';
import { getAgentConfig } from './agents.js';
import { processSkillTemplates, buildTemplateVars, processTemplate } from './template.js';
import { cleanupAgentSetup, getTransformer, extractFrontmatterName, replaceFrontmatterName } from './transformer.js';

const EXTENSION_INJECTION_BLOCK_PATTERN = /\n?<!-- aif-ext:[^:]+:[^:]+:[^:]+:start -->\n[\s\S]*?\n<!-- aif-ext:[^:]+:[^:]+:[^:]+:end -->\n?/g;

export type SkillUpdateStatus = 'changed' | 'unchanged' | 'skipped' | 'removed';

export interface SkillUpdateEntry {
  skill: string;
  status: SkillUpdateStatus;
  reason: string;
}

export interface UpdateSkillsResult {
  installedSkills: string[];
  entries: SkillUpdateEntry[];
}

export interface UpdateSkillsOptions {
  excludeSkills?: string[];
  force?: boolean;
}

export interface InstallOptions {
  projectDir: string;
  skillsDir: string;
  skills: string[];
  agentId: string;
}

interface ResolvedSkillPaths {
  sourceSkillDir: string;
  targetSkillDir: string;
  targetSkillFile: string;
  targetRefsDir: string;
  sourceRefsDir: string;
  flat: boolean;
}

function normalizeMarkdownForManagedHash(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(EXTENSION_INJECTION_BLOCK_PATTERN, '')
    .trimEnd();
}

async function readManagedFileForHash(filePath: string): Promise<Buffer | null> {
  if (path.extname(filePath).toLowerCase() === '.md') {
    const content = await readTextFile(filePath);
    if (!content) {
      return null;
    }
    return Buffer.from(normalizeMarkdownForManagedHash(content), 'utf-8');
  }

  return readFileBuffer(filePath);
}

async function hashManagedFiles(files: Array<{ absPath: string; relPath: string }>): Promise<string | null> {
  if (files.length === 0) {
    return null;
  }

  const sortedFiles = [...files].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const hasher = createHash('sha256');

  for (const file of sortedFiles) {
    const content = await readManagedFileForHash(file.absPath);
    if (!content) {
      return null;
    }
    hasher.update(`path:${file.relPath}\n`);
    hasher.update(content);
    hasher.update('\n');
  }

  return hasher.digest('hex');
}

async function hashManagedDirectory(dirPath: string): Promise<string | null> {
  const files = await listFilesRecursive(dirPath);
  if (files.length === 0) {
    return null;
  }

  const mapped = files.map(absPath => ({
    absPath,
    relPath: path.relative(dirPath, absPath).replaceAll('\\', '/'),
  }));

  return hashManagedFiles(mapped);
}

function resolveSkillPaths(
  projectDir: string,
  skillsDir: string,
  agentId: string,
  skillName: string,
  sourceSkillDir: string,
): ResolvedSkillPaths {
  const transformer = getTransformer(agentId);
  const agentConfig = getAgentConfig(agentId);
  const transformed = transformer.transform(skillName, '');

  const sourceRefsDir = path.join(sourceSkillDir, 'references');
  if (transformed.flat) {
    const targetSkillDir = path.join(projectDir, agentConfig.configDir, transformed.targetDir);
    return {
      sourceSkillDir,
      targetSkillDir,
      targetSkillFile: path.join(targetSkillDir, transformed.targetName),
      targetRefsDir: path.join(targetSkillDir, 'references'),
      sourceRefsDir,
      flat: true,
    };
  }

  const targetSkillDir = path.join(projectDir, skillsDir, transformed.targetDir);
  return {
    sourceSkillDir,
    targetSkillDir,
    targetSkillFile: path.join(targetSkillDir, 'SKILL.md'),
    targetRefsDir: path.join(targetSkillDir, 'references'),
    sourceRefsDir,
    flat: false,
  };
}

async function hashInstalledSkill(paths: ResolvedSkillPaths): Promise<string | null> {
  if (!paths.flat) {
    return hashManagedDirectory(paths.targetSkillDir);
  }

  const mainFileExists = await fileExists(paths.targetSkillFile);
  if (!mainFileExists) {
    return null;
  }

  const filesToHash: Array<{ absPath: string; relPath: string }> = [
    {
      absPath: paths.targetSkillFile,
      relPath: path.basename(paths.targetSkillFile),
    },
  ];

  const sourceRefs = await listFilesRecursive(paths.sourceRefsDir);
  for (const sourceRef of sourceRefs) {
    const relPath = path.relative(paths.sourceRefsDir, sourceRef).replaceAll('\\', '/');
    const targetRef = path.join(paths.targetRefsDir, relPath);
    filesToHash.push({
      absPath: targetRef,
      relPath: `references/${relPath}`,
    });
  }

  return hashManagedFiles(filesToHash);
}

async function getManagedSkillState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  skillName: string,
): Promise<ManagedSkillState | null> {
  const sourceSkillDir = path.join(getSkillsDir(), skillName);
  const sourceHash = await hashDirectory(sourceSkillDir);
  if (!sourceHash) {
    return null;
  }

  const paths = resolveSkillPaths(projectDir, agentInstallation.skillsDir, agentInstallation.id, skillName, sourceSkillDir);
  const installedHash = await hashInstalledSkill(paths);
  if (!installedHash) {
    return null;
  }

  return {
    sourceHash,
    installedHash,
  };
}

export async function buildManagedSkillsState(
  projectDir: string,
  agentInstallation: AgentInstallation,
  baseSkills: string[],
): Promise<Record<string, ManagedSkillState>> {
  const state: Record<string, ManagedSkillState> = {};

  for (const skillName of baseSkills) {
    const managed = await getManagedSkillState(projectDir, agentInstallation, skillName);
    if (managed) {
      state[skillName] = managed;
    }
  }

  return state;
}

async function installSkillWithTransformer(
  sourceSkillDir: string,
  skillName: string,
  projectDir: string,
  skillsDir: string,
  agentId: string,
  agentConfig: ReturnType<typeof getAgentConfig>,
): Promise<void> {
  const transformer = getTransformer(agentId);
  const skillMdPath = path.join(sourceSkillDir, 'SKILL.md');
  const content = await readTextFile(skillMdPath);
  if (!content) {
    throw new Error(`SKILL.md not found in ${sourceSkillDir}`);
  }

  // If skill is installed under a different name (e.g. replacement), rewrite frontmatter name
  const fmName = extractFrontmatterName(content);
  const adjustedContent = (fmName && fmName !== skillName) ? replaceFrontmatterName(content, skillName) : content;

  const result = transformer.transform(skillName, adjustedContent);
  const vars = buildTemplateVars(agentConfig);

  if (result.flat) {
    const targetPath = path.join(projectDir, agentConfig.configDir, result.targetDir, result.targetName);
    await writeTextFile(targetPath, processTemplate(result.content, vars));

    // Copy references directory if it exists in the source skill
    const sourceRefsDir = path.join(sourceSkillDir, 'references');
    if (await fileExists(sourceRefsDir)) {
      const targetRefsDir = path.join(projectDir, agentConfig.configDir, result.targetDir, 'references');
      await copyDirectory(sourceRefsDir, targetRefsDir);
    }
  } else {
    const targetSkillDir = path.join(projectDir, skillsDir, result.targetDir);
    await copyDirectory(sourceSkillDir, targetSkillDir);
    if (result.content !== content) {
      await writeTextFile(path.join(targetSkillDir, 'SKILL.md'), result.content);
    } else if (adjustedContent !== content) {
      await writeTextFile(path.join(targetSkillDir, 'SKILL.md'), adjustedContent);
    }
    await processSkillTemplates(targetSkillDir, agentConfig);
  }
}

export async function installSkills(options: InstallOptions): Promise<string[]> {
  const { projectDir, skillsDir, skills, agentId } = options;
  const installedSkills: string[] = [];
  const agentConfig = getAgentConfig(agentId);

  const targetDir = path.join(projectDir, skillsDir);
  await ensureDir(targetDir);

  const packageSkillsDir = getSkillsDir();

  for (const skill of skills) {
    const sourceSkillDir = path.join(packageSkillsDir, skill);

    try {
      await installSkillWithTransformer(sourceSkillDir, skill, projectDir, skillsDir, agentId, agentConfig);
      installedSkills.push(skill);
    } catch (error) {
      console.warn(`Warning: Could not install skill "${skill}": ${error}`);
    }
  }

  const transformer = getTransformer(agentId);
  if (transformer.postInstall) {
    await transformer.postInstall(projectDir);
  }

  return installedSkills;
}

export function partitionSkills(skills: string[]): { base: string[], custom: string[] } {
  return {
    base: skills.filter(s => !s.includes('/')),
    custom: skills.filter(s => s.includes('/')),
  };
}

export async function getAvailableSkills(): Promise<string[]> {
  const packageSkillsDir = getSkillsDir();
  const dirs = await listDirectories(packageSkillsDir);
  return dirs.filter(dir => !dir.startsWith('_'));
}

export async function installExtensionSkills(
  projectDir: string,
  agentInstallation: AgentInstallation,
  extensionDir: string,
  skillPaths: string[],
  nameOverrides?: Record<string, string>,
): Promise<string[]> {
  const agentConfig = getAgentConfig(agentInstallation.id);
  const installed: string[] = [];

  for (const skillPath of skillPaths) {
    const sourceDir = path.join(extensionDir, skillPath);
    const skillName = nameOverrides?.[skillPath] ?? path.basename(skillPath);
    try {
      await installSkillWithTransformer(sourceDir, skillName, projectDir, agentInstallation.skillsDir, agentInstallation.id, agentConfig);
      installed.push(skillName);
    } catch (error) {
      console.warn(`Warning: Could not install extension skill "${skillName}": ${error}`);
    }
  }

  return installed;
}

async function removeSkillsByName(
  projectDir: string,
  agentInstallation: AgentInstallation,
  skillNames: string[],
): Promise<string[]> {
  const agentConfig = getAgentConfig(agentInstallation.id);
  const transformer = getTransformer(agentInstallation.id);
  const removed: string[] = [];

  for (const skillName of skillNames) {
    try {
      const result = transformer.transform(skillName, '');
      if (result.flat) {
        const targetPath = path.join(projectDir, agentConfig.configDir, result.targetDir, result.targetName);
        await removeDirectory(targetPath);
      } else {
        const targetSkillDir = path.join(projectDir, agentInstallation.skillsDir, result.targetDir);
        await removeDirectory(targetSkillDir);
      }
      removed.push(skillName);
    } catch {
      // Skill may not exist, ignore
    }
  }

  return removed;
}

export async function removeExtensionSkills(
  projectDir: string,
  agentInstallation: AgentInstallation,
  skillPaths: string[],
): Promise<string[]> {
  return removeSkillsByName(projectDir, agentInstallation, skillPaths.map(p => path.basename(p)));
}

export async function updateSkills(
  agentInstallation: AgentInstallation,
  projectDir: string,
  options: UpdateSkillsOptions = {},
): Promise<UpdateSkillsResult> {
  const { excludeSkills = [], force = false } = options;
  const availableSkills = await getAvailableSkills();
  const availableSet = new Set(availableSkills);
  const excludeSet = new Set(excludeSkills);

  const entries: SkillUpdateEntry[] = [];

  const { base: previousBaseSkills, custom } = partitionSkills(agentInstallation.installedSkills);
  const previousBaseSet = new Set(previousBaseSkills);
  const previousManaged = agentInstallation.managedSkills ?? {};

  const removedSkills = previousBaseSkills.filter(s => !availableSet.has(s) && !excludeSet.has(s));
  if (removedSkills.length > 0) {
    await removeSkillsByName(projectDir, agentInstallation, removedSkills);
    for (const skill of removedSkills) {
      entries.push({
        skill,
        status: 'removed',
        reason: 'package-removed',
      });
    }
  }

  const replacedSkills = previousBaseSkills.filter(s => excludeSet.has(s));
  for (const skill of replacedSkills) {
    entries.push({
      skill,
      status: 'skipped',
      reason: 'replaced-by-extension',
    });
  }

  const newlyAvailable = availableSkills.filter(s => !previousBaseSet.has(s) && !excludeSet.has(s));
  for (const skill of newlyAvailable) {
    entries.push({
      skill,
      status: 'skipped',
      reason: 'new-skill-not-installed',
    });
  }

  const updatableBaseSkills = previousBaseSkills.filter(s => availableSet.has(s) && !excludeSet.has(s));
  const shouldInstall = new Map<string, { install: boolean; reason: string }>();

  for (const skillName of updatableBaseSkills) {
    const sourceSkillDir = path.join(getSkillsDir(), skillName);
    const sourceHash = await hashDirectory(sourceSkillDir);
    const paths = resolveSkillPaths(projectDir, agentInstallation.skillsDir, agentInstallation.id, skillName, sourceSkillDir);
    const installedHash = await hashInstalledSkill(paths);
    const previousState = previousManaged[skillName];

    if (force) {
      shouldInstall.set(skillName, { install: true, reason: 'force-clean-reinstall' });
      continue;
    }

    if (!sourceHash) {
      shouldInstall.set(skillName, { install: true, reason: 'source-missing' });
      continue;
    }

    if (!previousState) {
      shouldInstall.set(skillName, { install: true, reason: 'missing-managed-state' });
      continue;
    }

    if (!installedHash) {
      shouldInstall.set(skillName, { install: true, reason: 'missing-installed-artifact' });
      continue;
    }

    if (previousState.sourceHash !== sourceHash) {
      shouldInstall.set(skillName, { install: true, reason: 'source-hash-changed' });
      continue;
    }

    if (previousState.installedHash !== installedHash) {
      shouldInstall.set(skillName, { install: true, reason: 'installed-hash-drift' });
      continue;
    }

    shouldInstall.set(skillName, { install: false, reason: 'up-to-date' });
  }

  const skillsToInstall = updatableBaseSkills.filter(skillName => shouldInstall.get(skillName)?.install === true);

  if (force && skillsToInstall.length > 0) {
    if (agentInstallation.id === 'antigravity') {
      await cleanupAgentSetup(agentInstallation.id, projectDir, agentInstallation.skillsDir);
    } else {
      await removeSkillsByName(projectDir, agentInstallation, skillsToInstall);
    }
  }

  const installedBaseSkills = skillsToInstall.length > 0
    ? await installSkills({
      projectDir,
      skillsDir: agentInstallation.skillsDir,
      skills: skillsToInstall,
      agentId: agentInstallation.id,
    })
    : [];

  const installedSet = new Set(installedBaseSkills);

  for (const skillName of updatableBaseSkills) {
    const decision = shouldInstall.get(skillName);
    if (!decision) {
      continue;
    }

    if (decision.install) {
      entries.push({
        skill: skillName,
        status: installedSet.has(skillName) ? 'changed' : 'skipped',
        reason: installedSet.has(skillName) ? decision.reason : 'install-failed',
      });
      continue;
    }

    entries.push({
      skill: skillName,
      status: 'unchanged',
      reason: decision.reason,
    });
  }

  const retainedBaseSkills = previousBaseSkills.filter(s => (availableSet.has(s) || excludeSet.has(s)) && !removedSkills.includes(s));

  return {
    installedSkills: [...retainedBaseSkills, ...custom],
    entries,
  };
}
