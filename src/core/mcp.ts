import path from 'path';
import { readJsonFile, writeJsonFile, getMcpDir, ensureDir, fileExists } from '../utils/fs.js';
import { getAgentConfig } from './agents.js';

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpSettings {
  mcpServers?: Record<string, McpServerConfig>;
}

export interface McpOptions {
  github: boolean;
  filesystem: boolean;
  postgres: boolean;
  chromeDevtools: boolean;
}

export async function configureMcp(projectDir: string, options: McpOptions, agentId: string = 'claude'): Promise<string[]> {
  const agent = getAgentConfig(agentId);

  if (!agent.supportsMcp || !agent.settingsFile) {
    return [];
  }

  const configuredServers: string[] = [];
  const settingsPath = path.join(projectDir, agent.settingsFile);
  const settingsDir = path.dirname(settingsPath);

  await ensureDir(settingsDir);

  let settings: McpSettings = {};
  if (await fileExists(settingsPath)) {
    const existing = await readJsonFile<McpSettings>(settingsPath);
    if (existing) {
      settings = existing;
    }
  }

  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  const mcpTemplatesDir = path.join(getMcpDir(), 'templates');

  if (options.github) {
    const template = await readJsonFile<McpServerConfig>(path.join(mcpTemplatesDir, 'github.json'));
    if (template) {
      settings.mcpServers['github'] = template;
      configuredServers.push('github');
    }
  }

  if (options.filesystem) {
    const template = await readJsonFile<McpServerConfig>(path.join(mcpTemplatesDir, 'filesystem.json'));
    if (template) {
      settings.mcpServers['filesystem'] = template;
      configuredServers.push('filesystem');
    }
  }

  if (options.postgres) {
    const template = await readJsonFile<McpServerConfig>(path.join(mcpTemplatesDir, 'postgres.json'));
    if (template) {
      settings.mcpServers['postgres'] = template;
      configuredServers.push('postgres');
    }
  }

  if (options.chromeDevtools) {
    const template = await readJsonFile<McpServerConfig>(path.join(mcpTemplatesDir, 'chrome-devtools.json'));
    if (template) {
      settings.mcpServers['chromeDevtools'] = template;
      configuredServers.push('chromeDevtools');
    }
  }

  if (configuredServers.length > 0) {
    await writeJsonFile(settingsPath, settings);
  }

  return configuredServers;
}

export function getMcpInstructions(servers: string[]): string[] {
  const instructions: string[] = [];

  if (servers.includes('github')) {
    instructions.push(
      'GitHub MCP: Set GITHUB_TOKEN environment variable with your GitHub personal access token'
    );
  }

  if (servers.includes('filesystem')) {
    instructions.push(
      'Filesystem MCP: No additional configuration needed. Server provides file access tools.'
    );
  }

  if (servers.includes('postgres')) {
    instructions.push(
      'Postgres MCP: Set DATABASE_URL environment variable with your PostgreSQL connection string'
    );
  }

  if (servers.includes('chromeDevtools')) {
    instructions.push(
        'Chrome Devtools MCP: No additional configuration needed. Server provides your coding agent control and inspect a live Chrome browser.'
    );
  }

  return instructions;
}
