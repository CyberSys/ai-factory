import inquirer from 'inquirer';
import { detectStack, type DetectedStack } from './detector.js';
import { getAvailableSkills } from '../../core/installer.js';

export interface WizardAnswers {
  agent: 'claude' | 'universal';
  skillsDir: string;
  selectedSkills: string[];
  mcpGithub: boolean;
  mcpFilesystem: boolean;
  mcpPostgres: boolean;
}

export async function runWizard(projectDir: string): Promise<WizardAnswers> {
  const detectedStack = await detectStack(projectDir);
  const availableSkills = await getAvailableSkills();

  // Base skills that are always recommended
  const baseSkills = [
    'ai-factory',
    'skill-generator',
    'feature',
    'task',
    'implement',
    'commit',
    'review',
  ];

  if (detectedStack) {
    console.log(`\n📦 Detected: ${detectedStack.name}`);
    if (detectedStack.frameworks.length > 0) {
      console.log(`   Frameworks: ${detectedStack.frameworks.join(', ')}`);
    }
    console.log(`\n💡 Run /ai-factory after setup to generate stack-specific skills.\n`);
  } else {
    console.log('\n📦 No existing project detected.');
    console.log('💡 Run /ai-factory after setup to analyze or describe your project.\n');
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'agent',
      message: 'Target AI agent:',
      choices: [
        { name: 'Claude Code (.claude/)', value: 'claude' },
        { name: 'Universal / Other agents (.ai/)', value: 'universal' },
      ],
      default: 'claude',
    },
    {
      type: 'checkbox',
      name: 'selectedSkills',
      message: 'Base skills to install:',
      choices: availableSkills.map(skill => ({
        name: skill,
        value: skill,
        checked: true, // All skills selected by default
      })),
    },
    {
      type: 'confirm',
      name: 'configureMcp',
      message: 'Configure MCP servers?',
      default: detectedStack !== null, // suggest MCP if project exists
    },
  ]);

  let mcpAnswers = {
    mcpGithub: false,
    mcpFilesystem: false,
    mcpPostgres: false,
  };

  if (answers.configureMcp) {
    // Smart defaults based on detected stack
    const suggestPostgres = detectedStack?.name &&
      ['laravel', 'symfony', 'django', 'fastapi', 'nextjs', 'node-api'].includes(detectedStack.name);

    mcpAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'mcpGithub',
        message: 'GitHub MCP (PRs, issues, repo operations)?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'mcpPostgres',
        message: 'Postgres MCP (database queries)?',
        default: suggestPostgres,
      },
      {
        type: 'confirm',
        name: 'mcpFilesystem',
        message: 'Filesystem MCP (advanced file operations)?',
        default: false,
      },
    ]);
  }

  const skillsDir = answers.agent === 'claude' ? '.claude/skills' : '.ai/skills';

  return {
    agent: answers.agent,
    skillsDir,
    selectedSkills: answers.selectedSkills,
    ...mcpAnswers,
  };
}
