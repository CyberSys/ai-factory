import chalk from 'chalk';
import path from 'path';
import { loadConfig, saveConfig, getCurrentVersion } from '../../core/config.js';
import { installSkills, getAvailableSkills } from '../../core/installer.js';
import { getAgentConfig } from '../../core/agents.js';
import { fileExists, removeDirectory, removeFile } from '../../utils/fs.js';

// Old v1 skill directory names that were renamed to ai-factory-* in v2
const OLD_SKILL_NAMES = [
  'architecture',
  'best-practices',
  'build-automation',
  'ci',
  'commit',
  'deploy',
  'dockerize',
  'docs',
  'evolve',
  'feature',
  'fix',
  'implement',
  'improve',
  'review',
  'security-checklist',
  'skill-generator',
  'task',
  'verify',
];

// Old workflow skills stored as flat .md files by Antigravity transformer
const OLD_WORKFLOW_SKILLS = new Set([
  'commit',
  'deploy',
  'feature',
  'fix',
  'implement',
  'improve',
  'task',
  'verify',
]);

export async function upgradeCommand(): Promise<void> {
  const projectDir = process.cwd();

  console.log(chalk.bold.blue('\n🏭 AI Factory - Upgrade to v2\n'));

  const config = await loadConfig(projectDir);

  if (!config) {
    console.log(chalk.red('Error: No .ai-factory.json found.'));
    console.log(chalk.dim('Run "ai-factory init" to set up your project first.'));
    process.exit(1);
  }

  const agentConfig = getAgentConfig(config.agent);
  const skillsDir = path.join(projectDir, config.skillsDir);
  const isAntigravity = config.agent === 'antigravity';

  // Step 1: Remove old-format skills
  console.log(chalk.dim('Scanning for old-format skills...\n'));

  let removedCount = 0;

  for (const oldName of OLD_SKILL_NAMES) {
    // Antigravity: old workflow skills were flat files in workflows/
    if (isAntigravity && OLD_WORKFLOW_SKILLS.has(oldName)) {
      const flatFile = path.join(projectDir, agentConfig.configDir, 'workflows', `${oldName}.md`);
      if (await fileExists(flatFile)) {
        await removeFile(flatFile);
        console.log(chalk.yellow(`  Removed workflow: ${oldName}.md`));
        removedCount++;
      }
    }

    // All agents: remove old skill directory
    const oldDir = path.join(skillsDir, oldName);
    if (await fileExists(oldDir)) {
      await removeDirectory(oldDir);
      console.log(chalk.yellow(`  Removed skill: ${oldName}/`));
      removedCount++;
    }
  }

  if (removedCount === 0) {
    console.log(chalk.dim('  No old-format skills found.\n'));
  } else {
    console.log(chalk.dim(`\n  Removed ${removedCount} old-format skill(s).\n`));
  }

  // Step 2: Install new-format skills
  console.log(chalk.dim('Installing new-format skills...\n'));

  const availableSkills = await getAvailableSkills();
  const customSkills = config.installedSkills.filter(s => s.includes('/'));

  const installedSkills = await installSkills({
    projectDir,
    skillsDir: config.skillsDir,
    skills: availableSkills,
    stack: null,
    agentId: config.agent,
  });

  // Step 3: Update config
  const currentVersion = getCurrentVersion();
  config.version = currentVersion;
  config.installedSkills = [...installedSkills, ...customSkills];

  await saveConfig(projectDir, config);

  // Step 4: Summary
  console.log(chalk.green('✓ Upgrade to v2 complete!\n'));

  const baseSkills = installedSkills.filter(s => !s.includes('/'));
  console.log(chalk.bold('Installed skills:'));
  for (const skill of baseSkills) {
    console.log(chalk.dim(`  - ${skill}`));
  }

  if (customSkills.length > 0) {
    console.log(chalk.bold('\nCustom skills (preserved):'));
    for (const skill of customSkills) {
      console.log(chalk.dim(`  - ${skill}`));
    }
  }
  console.log('');
}
