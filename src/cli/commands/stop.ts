import { execSync } from 'node:child_process';

/**
 * CLI stop command options
 */
export interface StopOptions {
  /** Force stop (don't wait for graceful shutdown) */
  force?: boolean;
  /** PM2 process name */
  name?: string;
}

/**
 * Execute the stop command
 * @param options - Command options
 * @returns Exit code (0 for success, 1 for error)
 */
export async function stopCommand(options: StopOptions = {}): Promise<number> {
  const processName = options.name || 'digital-fte';

  console.log(`Stopping ${processName}...`);

  try {
    // Try PM2 first
    try {
      const stopCmd = options.force
        ? `pm2 delete ${processName}`
        : `pm2 stop ${processName}`;

      execSync(stopCmd, { stdio: 'inherit' });
      console.log(`${processName} stopped via PM2`);
      return 0;
    } catch {
      // PM2 not available or process not found
    }

    // Try to find and kill process by name
    try {
      // This works on Unix-like systems
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows
        execSync(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq ${processName}"`, {
          stdio: 'pipe',
        });
      } else {
        // Unix-like
        const signal = options.force ? 'SIGKILL' : 'SIGTERM';
        execSync(`pkill -${signal} -f "digital-fte"`, { stdio: 'pipe' });
      }

      console.log(`${processName} stopped`);
      return 0;
    } catch {
      // Process not found
    }

    console.log('No running digital-fte process found');
    console.log('');
    console.log('If using PM2:');
    console.log('  pm2 stop digital-fte');
    console.log('');
    console.log('If running in foreground:');
    console.log('  Press Ctrl+C in the terminal running the process');

    return 0;
  } catch (e) {
    console.error('Failed to stop process:', e instanceof Error ? e.message : e);
    return 1;
  }
}

/**
 * CLI entry point for stop command
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: StopOptions = {};

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--name' || arg === '-n') {
      options.name = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: digital-fte stop [options]');
      console.log('');
      console.log('Stop the Digital FTE cognitive loop daemon.');
      console.log('');
      console.log('Options:');
      console.log('  -f, --force         Force stop (no graceful shutdown)');
      console.log('  -n, --name <name>   PM2 process name (default: digital-fte)');
      console.log('  -h, --help          Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  digital-fte stop');
      console.log('  digital-fte stop --force');
      console.log('  pm2 stop digital-fte');
      process.exit(0);
    }
  }

  const exitCode = await stopCommand(options);
  process.exit(exitCode);
}
