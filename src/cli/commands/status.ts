import { getStatus, getDetailedStats, formatStatus } from '../../modules/vault/index.js';
import { verifyIntegrity, summarizeAnomalies } from '../../modules/vault/verify.js';
import { loadVaultConfig, createVaultConfig } from '../../config.js';
import { ConfigError } from '../../lib/errors.js';

/**
 * CLI status command options
 */
export interface StatusOptions {
  /** Vault path (overrides VAULT_PATH env) */
  path?: string;
  /** Show detailed statistics */
  detailed?: boolean;
  /** Output as JSON */
  json?: boolean;
}

/**
 * Execute the status command
 * @param options - Command options
 * @returns Exit code (0 for healthy, 1 for unhealthy/error)
 */
export async function statusCommand(options: StatusOptions = {}): Promise<number> {
  const log = console.log;
  const error = console.error;

  try {
    // Load or create config
    let config;
    if (options.path) {
      config = createVaultConfig(options.path);
    } else {
      try {
        config = loadVaultConfig();
      } catch (e) {
        if (e instanceof ConfigError) {
          if (options.json) {
            log(JSON.stringify({ error: 'VAULT_PATH not set' }));
          } else {
            error('Error: VAULT_PATH environment variable is not set.');
            error('');
            error('Set it using:');
            error('  export VAULT_PATH=/path/to/your/vault');
          }
          return 1;
        }
        throw e;
      }
    }

    if (options.detailed) {
      // Get detailed stats
      const { status, details } = await getDetailedStats(config);
      const anomalies = await verifyIntegrity(config);

      if (options.json) {
        log(JSON.stringify({ status, details, anomalies }, null, 2));
      } else {
        log('=== Vault Status ===');
        log('');
        log(formatStatus(status));
        log('');
        log('=== Details ===');
        log(`Tasks pending: ${details.tasks_pending}`);
        log(`Plans approved: ${details.plans_approved}`);
        log(`Plans rejected: ${details.plans_rejected}`);
        log(`Tasks completed: ${details.tasks_completed}`);
        log(`Tasks failed: ${details.tasks_failed}`);
        log(`Tasks invalid: ${details.tasks_invalid}`);

        if (anomalies.length > 0) {
          log('');
          log('=== Issues ===');
          log(summarizeAnomalies(anomalies));
          for (const anomaly of anomalies) {
            log(`  - [${anomaly.type}] ${anomaly.path}: ${anomaly.details}`);
          }
        }
      }

      return status.healthy ? 0 : 1;
    } else {
      // Basic status
      const status = await getStatus(config);

      if (options.json) {
        log(JSON.stringify(status, null, 2));
      } else {
        log('=== Vault Status ===');
        log('');
        log(formatStatus(status));
      }

      return status.healthy ? 0 : 1;
    }
  } catch (e) {
    if (options.json) {
      log(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }));
    } else if (e instanceof Error) {
      error(`Error: ${e.message}`);
    } else {
      error('An unknown error occurred');
    }
    return 1;
  }
}

/**
 * CLI entry point for status command
 * Parses process.argv for options
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: StatusOptions = {};

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--path' || arg === '-p') {
      options.path = args[++i];
    } else if (arg === '--detailed' || arg === '-d') {
      options.detailed = true;
    } else if (arg === '--json' || arg === '-j') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: vault:status [options]');
      console.log('');
      console.log('Show the status of the Digital FTE vault.');
      console.log('');
      console.log('Options:');
      console.log('  -p, --path <path>  Vault path (overrides VAULT_PATH env)');
      console.log('  -d, --detailed     Show detailed statistics');
      console.log('  -j, --json         Output as JSON');
      console.log('  -h, --help         Show this help message');
      console.log('');
      console.log('Environment:');
      console.log('  VAULT_PATH         Default vault path');
      console.log('');
      console.log('Exit codes:');
      console.log('  0  Vault is healthy');
      console.log('  1  Vault has issues or error occurred');
      process.exit(0);
    }
  }

  const exitCode = await statusCommand(options);
  process.exit(exitCode);
}
