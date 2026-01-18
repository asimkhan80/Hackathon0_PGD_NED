import { join } from 'node:path';
import type { VaultConfig, VaultDirectories, AppConfig } from './types/config.js';
import { ConfigError } from './lib/errors.js';

/**
 * Default vault directory names
 */
const DEFAULT_DIRECTORIES = {
  needs_action: 'Needs_Action',
  plans: 'Plans',
  plans_pending: 'Plans/pending',
  plans_approved: 'Plans/approved',
  plans_rejected: 'Plans/rejected',
  accounting: 'Accounting',
  done: 'Done',
  done_invalid: 'Done/invalid',
  done_failed: 'Done/failed',
  logs: 'Logs',
} as const;

/**
 * Default application configuration values
 */
const DEFAULT_APP_CONFIG = {
  log_level: 'info' as const,
  approval_poll_ms: 5000,
  graceful_shutdown_ms: 30000,
};

/**
 * Get vault directory paths relative to root
 * @param rootPath - Vault root directory path
 * @returns VaultDirectories with full paths
 */
export function getVaultPaths(rootPath: string): VaultDirectories {
  return {
    needs_action: join(rootPath, DEFAULT_DIRECTORIES.needs_action),
    plans: join(rootPath, DEFAULT_DIRECTORIES.plans),
    plans_pending: join(rootPath, DEFAULT_DIRECTORIES.plans_pending),
    plans_approved: join(rootPath, DEFAULT_DIRECTORIES.plans_approved),
    plans_rejected: join(rootPath, DEFAULT_DIRECTORIES.plans_rejected),
    accounting: join(rootPath, DEFAULT_DIRECTORIES.accounting),
    done: join(rootPath, DEFAULT_DIRECTORIES.done),
    done_invalid: join(rootPath, DEFAULT_DIRECTORIES.done_invalid),
    done_failed: join(rootPath, DEFAULT_DIRECTORIES.done_failed),
    logs: join(rootPath, DEFAULT_DIRECTORIES.logs),
  };
}

/**
 * Get list of all vault directories to create
 * @param config - Vault configuration
 * @returns Array of directory paths in creation order
 */
export function getDirectoryList(config: VaultConfig): string[] {
  const { directories } = config;
  return [
    directories.needs_action,
    directories.plans,
    directories.plans_pending,
    directories.plans_approved,
    directories.plans_rejected,
    directories.accounting,
    directories.done,
    directories.done_invalid,
    directories.done_failed,
    directories.logs,
  ];
}

/**
 * Load vault configuration from environment
 * @returns VaultConfig with paths resolved
 * @throws ConfigError if VAULT_PATH is not set
 */
export function loadVaultConfig(): VaultConfig {
  const rootPath = process.env.VAULT_PATH;

  if (!rootPath) {
    throw new ConfigError(
      'VAULT_PATH environment variable is required. Set it to your Obsidian vault path.'
    );
  }

  return {
    root_path: rootPath,
    directories: getVaultPaths(rootPath),
  };
}

/**
 * Load full application configuration
 * @returns AppConfig with all settings
 * @throws ConfigError if required environment variables are missing
 */
export function loadConfig(): AppConfig {
  const vault = loadVaultConfig();

  const logLevel = process.env.LOG_LEVEL as AppConfig['log_level'] | undefined;
  const approvalPollMs = process.env.APPROVAL_POLL_MS
    ? parseInt(process.env.APPROVAL_POLL_MS, 10)
    : undefined;
  const gracefulShutdownMs = process.env.GRACEFUL_SHUTDOWN_MS
    ? parseInt(process.env.GRACEFUL_SHUTDOWN_MS, 10)
    : undefined;

  return {
    vault,
    log_level: logLevel || DEFAULT_APP_CONFIG.log_level,
    approval_poll_ms: approvalPollMs || DEFAULT_APP_CONFIG.approval_poll_ms,
    graceful_shutdown_ms: gracefulShutdownMs || DEFAULT_APP_CONFIG.graceful_shutdown_ms,
  };
}

/**
 * Create vault config for a specific path (testing/manual usage)
 * @param rootPath - Vault root directory path
 * @returns VaultConfig for the specified path
 */
export function createVaultConfig(rootPath: string): VaultConfig {
  return {
    root_path: rootPath,
    directories: getVaultPaths(rootPath),
  };
}

/**
 * Validate vault configuration
 * @param config - Configuration to validate
 * @throws ConfigError if configuration is invalid
 */
export function validateConfig(config: VaultConfig): void {
  if (!config.root_path) {
    throw new ConfigError('Vault root_path is required');
  }

  const requiredDirs = [
    'needs_action',
    'plans',
    'plans_pending',
    'plans_approved',
    'plans_rejected',
    'accounting',
    'done',
    'done_invalid',
    'done_failed',
    'logs',
  ] as const;

  for (const dir of requiredDirs) {
    if (!config.directories[dir]) {
      throw new ConfigError(`Missing directory configuration: ${dir}`);
    }
  }
}

/**
 * Environment variable names used by the application
 */
export const ENV_VARS = {
  VAULT_PATH: 'VAULT_PATH',
  LOG_LEVEL: 'LOG_LEVEL',
  APPROVAL_POLL_MS: 'APPROVAL_POLL_MS',
  GRACEFUL_SHUTDOWN_MS: 'GRACEFUL_SHUTDOWN_MS',
} as const;
