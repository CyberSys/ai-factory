import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';

const program = new Command();

program
  .name('ai-factory')
  .description('CLI tool for automating Claude Code context setup')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize ai-factory in current project')
  .action(initCommand);

program
  .command('update')
  .description('Update installed skills to latest version')
  .action(updateCommand);

program.parse();
