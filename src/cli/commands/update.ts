import chalk from 'chalk';
import path from 'path';
import {realpathSync} from 'fs';
import {execSync} from 'child_process';
import inquirer from 'inquirer';
import {getCurrentVersion, loadConfig, saveConfig} from '../../core/config.js';
import {getAvailableSkills, partitionSkills, updateSkills} from '../../core/installer.js';
import {applyExtensionInjections} from '../../core/injections.js';
import {getExtensionsDir, loadExtensionManifest} from '../../core/extensions.js';
import {
  installExtensionSkillsForAllAgents,
  installSkillsForAllAgents,
  collectReplacedSkills,
} from '../../core/extension-ops.js';

function parseVersion(v: string): { parts: number[]; prerelease: string | null } {
  const [core, ...rest] = v.split('-');
  return {
    parts: core.split('.').map(Number),
    prerelease: rest.length > 0 ? rest.join('-') : null,
  };
}

function isNewerVersion(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if ((l.parts[i] ?? 0) > (c.parts[i] ?? 0)) return true;
    if ((l.parts[i] ?? 0) < (c.parts[i] ?? 0)) return false;
  }
  // Equal major.minor.patch: prerelease is older than stable (semver §11)
  if (c.prerelease && !l.prerelease) return true;
  if (!c.prerelease && l.prerelease) return false;
  return false;
}

async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch('https://registry.npmjs.org/ai-factory/latest', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json() as {version: string};
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(data.version)) return null;
    return data.version;
  } catch {
    return null;
  }
}

function getInstallCommand(version: string): string {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const binPath = execSync(`${whichCmd} ai-factory`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).split('\n')[0].trim();
    const realPath = realpathSync(binPath).replaceAll('\\', '/');

    if (realPath.includes('.bun/')) return `bun add -g ai-factory@${version}`;
    if (realPath.includes('/mise/')) return `mise use -g npm:ai-factory@${version}`;
    if (realPath.includes('/volta/')) return `volta install ai-factory@${version}`;
    if (realPath.includes('/pnpm/')) return `pnpm add -g ai-factory@${version}`;
    if (realPath.includes('/yarn/')) return `yarn global add ai-factory@${version}`;
  } catch {
    // Binary not found or symlink resolution failed, default to npm
  }
  return `npm install -g ai-factory@${version}`;
}

async function selfUpdate(currentVersion: string): Promise<boolean> {
  const latestVersion = await getLatestVersion();
  if (!latestVersion) {
    console.log(chalk.dim('Could not check for new versions\n'));
    return false;
  }

  if (!isNewerVersion(latestVersion, currentVersion)) {
    console.log(chalk.dim('ai-factory is up to date\n'));
    return false;
  }

  console.log(chalk.cyan(`📦 New version available: ${currentVersion} → ${latestVersion}`));

  if (!process.stdin.isTTY) {
    console.log(chalk.dim('Non-interactive mode — skipping self-update\n'));
    return false;
  }

  const {shouldUpdate} = await inquirer.prompt([{
    type: 'confirm',
    name: 'shouldUpdate',
    message: `Update ai-factory to ${latestVersion}?`,
    default: true,
  }]);

  if (!shouldUpdate) {
    console.log(chalk.dim('Skipping package update\n'));
    return false;
  }

  try {
    const installCmd = getInstallCommand(latestVersion);
    console.log(chalk.dim(`\n$ ${installCmd}`));
    execSync(installCmd, {stdio: 'inherit'});
    console.log(chalk.green(`\n✓ Updated to ${latestVersion}`));
    console.log(chalk.cyan('Please re-run `ai-factory update` to update skills with the new version.\n'));
    process.exitCode = 75; // EX_TEMPFAIL — signals caller to re-run
    return true;
  } catch (error) {
    console.log(chalk.yellow(`⚠ Self-update failed: ${(error as Error).message}`));
    return false;
  }
}

export async function updateCommand(): Promise<void> {
  const projectDir = process.cwd();

  console.log(chalk.bold.blue('\n🏭 AI Factory - Update Skills\n'));

  const config = await loadConfig(projectDir);

  if (!config) {
    console.log(chalk.red('Error: No .ai-factory.json found.'));
    console.log(chalk.dim('Run "ai-factory init" to set up your project first.'));
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();

  console.log(chalk.dim(`Config version: ${config.version}`));
  console.log(chalk.dim(`Package version: ${currentVersion}\n`));

  const selfUpdated = await selfUpdate(currentVersion);
  if (selfUpdated) return;

  console.log(chalk.dim('Updating skills...\n'));

  try {
    const availableSkills = await getAvailableSkills();
    const previousBaseSkillsByAgent = new Map<string, string[]>();

    for (const agent of config.agents) {
      const { base: previousBaseSkills } = partitionSkills(agent.installedSkills);
      previousBaseSkillsByAgent.set(agent.id, previousBaseSkills);
      const newSkills = availableSkills.filter(s => !previousBaseSkills.includes(s));

      const removedSkills = previousBaseSkills.filter(s => !availableSkills.includes(s));

      if (newSkills.length > 0) {
        console.log(chalk.cyan(`📦 [${agent.id}] New skills available: ${newSkills.join(', ')}`));
      }
      if (removedSkills.length > 0) {
        console.log(chalk.yellow(`🗑️  [${agent.id}] Removed skills: ${removedSkills.join(', ')}`));
      }
    }
    if (config.agents.length > 0) {
      console.log('');
    }

    // Collect all replaced skills from extensions
    const extensions = config.extensions ?? [];
    const allReplacedSkills = collectReplacedSkills(extensions);

    if (allReplacedSkills.size > 0) {
      console.log(chalk.dim(`Skipping replaced skills: ${[...allReplacedSkills].join(', ')}`));
    }

    for (const agent of config.agents) {
      agent.installedSkills = await updateSkills(agent, projectDir, [...allReplacedSkills]);
    }

    // Re-install replacement skills from extensions
    // Fix 3: If manifest fails to load, fall back to installing the base skill
    const failedReplacements: string[] = [];
    for (const ext of extensions) {
      if (!ext.replacedSkills?.length) continue;
      const extensionDir = path.join(getExtensionsDir(projectDir), ext.name);
      const manifest = await loadExtensionManifest(extensionDir);
      if (!manifest?.replaces) {
        console.log(chalk.yellow(`⚠ Extension "${ext.name}" manifest missing — restoring base skills: ${ext.replacedSkills.join(', ')}`));
        failedReplacements.push(...ext.replacedSkills);
        ext.replacedSkills = [];
        continue;
      }

      const nameOverrides: Record<string, string> = { ...manifest.replaces };
      const manifestBaseSkills = new Set(Object.values(manifest.replaces));
      const replacePaths = Object.entries(manifest.replaces)
        .filter(([, baseSkill]) => ext.replacedSkills!.includes(baseSkill))
        .map(([extPath]) => extPath);

      // Detect replacedSkills in config that no longer exist in manifest.replaces
      const orphanedReplacements = ext.replacedSkills!.filter(s => !manifestBaseSkills.has(s));
      if (orphanedReplacements.length > 0) {
        console.log(chalk.yellow(`⚠ Extension "${ext.name}" no longer replaces: ${orphanedReplacements.join(', ')}`));
        failedReplacements.push(...orphanedReplacements);
        ext.replacedSkills = ext.replacedSkills!.filter(s => manifestBaseSkills.has(s));
      }

      if (replacePaths.length > 0) {
        const results = await installExtensionSkillsForAllAgents(projectDir, config.agents, extensionDir, replacePaths, nameOverrides);

        // Detect replacements that failed to install on all agents
        const agentCount = config.agents.length;
        for (const [extPath, baseSkill] of Object.entries(manifest.replaces)) {
          if (!ext.replacedSkills!.includes(baseSkill)) continue;
          if (!replacePaths.includes(extPath)) continue;
          let successCount = 0;
          for (const installed of results.values()) {
            if (installed.includes(baseSkill)) successCount++;
          }
          if (successCount < agentCount) {
            console.log(chalk.yellow(`⚠ Extension "${ext.name}" replacement "${baseSkill}" failed to install — restoring base skill`));
            failedReplacements.push(baseSkill);
            ext.replacedSkills = ext.replacedSkills!.filter(s => s !== baseSkill);
          }
        }
      }
    }

    // Install base skills that couldn't be replaced due to broken extensions
    // But only if no other extension still replaces them
    if (failedReplacements.length > 0) {
      const stillReplacedByOthers = collectReplacedSkills(extensions);
      const toRestore = failedReplacements.filter(s => !stillReplacedByOthers.has(s));
      if (toRestore.length > 0) {
        await installSkillsForAllAgents(projectDir, config.agents, toRestore);
      }
    }

    // Re-apply extension injections
    if (config.extensions?.length) {
      let totalInjections = 0;
      for (const agent of config.agents) {
        totalInjections += await applyExtensionInjections(projectDir, agent, config.extensions!);
      }
      if (totalInjections > 0) {
        console.log(chalk.green(`✓ Re-applied ${totalInjections} extension injection(s)`));
      }
    }

    config.version = currentVersion;
    await saveConfig(projectDir, config);

    console.log(chalk.green('✓ Skills updated successfully'));
    console.log(chalk.green('✓ Configuration updated'));

    for (const agent of config.agents) {
      const previousBaseSkills = previousBaseSkillsByAgent.get(agent.id) ?? [];
      const newSkills = availableSkills.filter(s => !previousBaseSkills.includes(s));
      const { base: baseSkills, custom: customSkills } = partitionSkills(agent.installedSkills);

      console.log(chalk.bold(`\n[${agent.id}] Base skills:`));
      for (const skill of baseSkills) {
        const isNew = newSkills.includes(skill);
        console.log(chalk.dim(`  - ${skill}`) + (isNew ? chalk.green(' (new)') : ''));
      }

      if (customSkills.length > 0) {
        console.log(chalk.bold(`[${agent.id}] Custom skills (preserved):`));
        for (const skill of customSkills) {
          console.log(chalk.dim(`  - ${skill}`));
        }
      }
    }
    console.log('');

  } catch (error) {
    console.log(chalk.red(`Error updating skills: ${(error as Error).message}`));
    process.exit(1);
  }
}
