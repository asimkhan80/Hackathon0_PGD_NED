// Types
export * from './types/index.js';

// Configuration
export {
  loadConfig,
  loadVaultConfig,
  createVaultConfig,
  getVaultPaths,
  getDirectoryList,
  validateConfig,
  ENV_VARS,
} from './config.js';

// Library utilities
export * from './lib/index.js';

// Vault module
export * as vault from './modules/vault/index.js';

// Task module
export * as task from './modules/task/index.js';

// Plan module
export * as plan from './modules/plan/index.js';

// Audit module
export * as audit from './modules/audit/index.js';

// Error module
export * as error from './modules/error/index.js';

// Cognitive loop module
export * as loop from './modules/loop/index.js';
