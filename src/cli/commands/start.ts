import pino from 'pino';
import { loadConfig, createVaultConfig } from '../../config.js';
import { initialize } from '../../modules/vault/index.js';
import { createLoop, CognitiveLoop } from '../../modules/loop/index.js';
import { ConfigError } from '../../lib/errors.js';

/**
 * CLI start command options
 */
export interface StartOptions {
  /** Vault path (overrides VAULT_PATH env) */
  path?: string;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Don't daemonize (run in foreground) */
  foreground?: boolean;
}

// Global reference for signal handlers
let loop: CognitiveLoop | null = null;

/**
 * Execute the start command
 * @param options - Command options
 * @returns Exit code (0 for success, 1 for error)
 */
export async function startCommand(options: StartOptions = {}): Promise<number> {
  const logger = pino({
    level: options.logLevel || 'info',
  });

  try {
    // Load config
    let config;
    if (options.path) {
      config = {
        vault: createVaultConfig(options.path),
        log_level: options.logLevel || 'info',
        approval_poll_ms: 5000,
        graceful_shutdown_ms: 30000,
      };
      logger.info(`Using vault path: ${options.path}`);
    } else {
      try {
        config = loadConfig();
        logger.info(`Using vault path: ${config.vault.root_path}`);
      } catch (e) {
        if (e instanceof ConfigError) {
          logger.error('VAULT_PATH environment variable is not set.');
          logger.error('');
          logger.error('Set it using:');
          logger.error('  export VAULT_PATH=/path/to/your/vault');
          return 1;
        }
        throw e;
      }
    }

    // Initialize vault (idempotent)
    logger.info('Initializing vault...');
    const initResult = await initialize(config.vault);
    if (initResult.created.length > 0) {
      logger.info({ created: initResult.created.length }, 'Created directories');
    }

    // Create and start the loop
    loop = createLoop(config.vault, logger);

    // Set up event handlers
    const events = loop.getEvents();

    events.on('task:created', (task) => {
      logger.info({ taskId: task.id, title: task.title }, 'Task created');
    });

    events.on('task:stateChanged', (taskId, from, to) => {
      logger.info({ taskId, from, to }, 'State changed');
    });

    events.on('task:completed', (taskId, success) => {
      logger.info({ taskId, success }, 'Task completed');
    });

    events.on('task:error', (taskId, error) => {
      logger.error({ taskId, error }, 'Task error');
    });

    events.on('loop:started', () => {
      logger.info('Cognitive loop is running');
      logger.info('Drop .md files into /Needs_Action to process them');
      logger.info('Press Ctrl+C to stop');
    });

    events.on('loop:stopped', (graceful) => {
      logger.info({ graceful }, 'Cognitive loop stopped');
    });

    // Set up graceful shutdown
    setupSignalHandlers(logger);

    // Start the loop
    await loop.start();

    // Keep running until stopped
    await new Promise<void>((resolve) => {
      events.on('loop:stopped', () => resolve());
    });

    return 0;
  } catch (e) {
    logger.error({ error: e }, 'Failed to start cognitive loop');
    return 1;
  }
}

/**
 * Set up signal handlers for graceful shutdown
 */
function setupSignalHandlers(logger: pino.Logger): void {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received signal, shutting down...');

    if (loop && loop.isRunning()) {
      await loop.stop();
    }

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    if (loop && loop.isRunning()) {
      loop.stop().then(() => process.exit(1));
    } else {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });
}

/**
 * CLI entry point for start command
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: StartOptions = {};

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--path' || arg === '-p') {
      options.path = args[++i];
    } else if (arg === '--log-level' || arg === '-l') {
      options.logLevel = args[++i] as StartOptions['logLevel'];
    } else if (arg === '--foreground' || arg === '-f') {
      options.foreground = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: digital-fte start [options]');
      console.log('');
      console.log('Start the Digital FTE cognitive loop daemon.');
      console.log('');
      console.log('Options:');
      console.log('  -p, --path <path>     Vault path (overrides VAULT_PATH env)');
      console.log('  -l, --log-level       Log level (debug, info, warn, error)');
      console.log('  -f, --foreground      Run in foreground (default)');
      console.log('  -h, --help            Show this help message');
      console.log('');
      console.log('Environment:');
      console.log('  VAULT_PATH            Default vault path');
      console.log('  LOG_LEVEL             Default log level');
      console.log('');
      console.log('Examples:');
      console.log('  digital-fte start');
      console.log('  digital-fte start --path ~/my-vault');
      console.log('  digital-fte start --log-level debug');
      process.exit(0);
    }
  }

  const exitCode = await startCommand(options);
  process.exit(exitCode);
}
