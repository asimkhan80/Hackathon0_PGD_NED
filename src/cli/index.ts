#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';

const program = new Command();

program
  .name('digital-fte')
  .description('Digital FTE Cognitive Loop Core - File-based autonomous agent')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize vault directory structure')
  .option('-p, --path <path>', 'Vault path (overrides VAULT_PATH env)')
  .option('-q, --quiet', 'Minimal output')
  .action(async (options) => {
    const exitCode = await initCommand(options);
    process.exit(exitCode);
  });

// Status command
program
  .command('status')
  .description('Show vault status')
  .option('-p, --path <path>', 'Vault path (overrides VAULT_PATH env)')
  .option('-d, --detailed', 'Show detailed statistics')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const exitCode = await statusCommand(options);
    process.exit(exitCode);
  });

// Start command
program
  .command('start')
  .description('Start the cognitive loop daemon')
  .option('-p, --path <path>', 'Vault path (overrides VAULT_PATH env)')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('-f, --foreground', 'Run in foreground')
  .action(async (options) => {
    const exitCode = await startCommand({
      path: options.path,
      logLevel: options.logLevel,
      foreground: options.foreground,
    });
    process.exit(exitCode);
  });

// Stop command
program
  .command('stop')
  .description('Stop the cognitive loop daemon')
  .option('-f, --force', 'Force stop (no graceful shutdown)')
  .option('-n, --name <name>', 'PM2 process name', 'digital-fte')
  .action(async (options) => {
    const exitCode = await stopCommand(options);
    process.exit(exitCode);
  });

program.parse();
