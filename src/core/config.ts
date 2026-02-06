import path from 'path';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';

export interface AiFactoryConfig {
  version: string;
  agent: 'claude' | 'universal';
  skillsDir: string;
  installedSkills: string[];
  mcp: {
    github: boolean;
    filesystem: boolean;
    postgres: boolean;
  };
}

const CONFIG_FILENAME = '.ai-factory.json';
const CURRENT_VERSION = '1.0.0';

export function getConfigPath(projectDir: string): string {
  return path.join(projectDir, CONFIG_FILENAME);
}

export function createDefaultConfig(): AiFactoryConfig {
  return {
    version: CURRENT_VERSION,
    agent: 'claude',
    skillsDir: '.claude/skills',
    installedSkills: [],
    mcp: {
      github: false,
      filesystem: false,
      postgres: false,
    },
  };
}

export async function loadConfig(projectDir: string): Promise<AiFactoryConfig | null> {
  const configPath = getConfigPath(projectDir);
  return readJsonFile<AiFactoryConfig>(configPath);
}

export async function saveConfig(projectDir: string, config: AiFactoryConfig): Promise<void> {
  const configPath = getConfigPath(projectDir);
  await writeJsonFile(configPath, config);
}

export async function configExists(projectDir: string): Promise<boolean> {
  const configPath = getConfigPath(projectDir);
  return fileExists(configPath);
}

export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}
