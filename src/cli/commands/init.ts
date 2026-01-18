import { initialize } from '../../modules/vault/index.js';
import { loadVaultConfig, createVaultConfig } from '../../config.js';
import { ConfigError, VaultInitError } from '../../lib/errors.js';

/**
 * CLI init command options
 */
export interface InitOptions {
  /** Vault path (overrides VAULT_PATH env) */
  path?: string;
  /** Quiet mode (minimal output) */
  quiet?: boolean;
}

/**
 * Execute the init command
 * @param options - Command options
 * @returns Exit code (0 for success, 1 for error)
 */
export async function initCommand(options: InitOptions = {}): Promise<number> {
  const log = options.quiet ? () => {} : console.log;
  const error = console.error;

  try {
    // Load or create config
    let config;
    if (options.path) {
      config = createVaultConfig(options.path);
      log(`Using vault path: ${options.path}`);
    } else {
      try {
        config = loadVaultConfig();
        log(`Using vault path from VAULT_PATH: ${config.root_path}`);
      } catch (e) {
        if (e instanceof ConfigError) {
          error('Error: VAULT_PATH environment variable is not set.');
          error('');
          error('Set it using:');
          error('  export VAULT_PATH=/path/to/your/vault');
          error('');
          error('Or provide a path directly:');
          error('  npm run vault:init -- --path /path/to/your/vault');
          return 1;
        }
        throw e;
      }
    }

    log('');
    log('Initializing vault...');

    // Run initialization
    const result = await initialize(config);

    // Report results
    if (result.created.length > 0) {
      log('');
      log('Created directories:');
      for (const dir of result.created) {
        log(`  + ${dir}`);
      }
    }

    if (result.existing.length > 0 && !options.quiet) {
      log('');
      log('Existing directories:');
      for (const dir of result.existing) {
        log(`  = ${dir}`);
      }
    }

    if (result.warnings.length > 0) {
      log('');
      log('Warnings:');
      for (const warning of result.warnings) {
        log(`  ! ${warning}`);
      }
    }

    log('');
    if (result.success) {
      log('Vault initialized successfully!');
      return 0;
    } else {
      log('Vault initialization completed with warnings.');
      return 0; // Still success, just with warnings
    }
  } catch (e) {
    if (e instanceof VaultInitError) {
      error(`Failed to initialize vault: ${e.message}`);
      error(`Path: ${e.path}`);
      return 1;
    }

    if (e instanceof Error) {
      error(`Unexpected error: ${e.message}`);
      return 1;
    }

    error('An unknown error occurred');
    return 1;
  }
}

/**
 * CLI entry point for init command
 * Parses process.argv for options
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: InitOptions = {};

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--path' || arg === '-p') {
      options.path = args[++i];
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: vault:init [options]');
      console.log('');
      console.log('Initialize the Digital FTE vault directory structure.');
      console.log('');
      console.log('Options:');
      console.log('  -p, --path <path>  Vault path (overrides VAULT_PATH env)');
      console.log('  -q, --quiet        Minimal output');
      console.log('  -h, --help         Show this help message');
      console.log('');
      console.log('Environment:');
      console.log('  VAULT_PATH         Default vault path');
      process.exit(0);
    }
  }

  const exitCode = await initCommand(options);
  process.exit(exitCode);
}
