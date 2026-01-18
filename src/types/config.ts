/**
 * Vault directory paths configuration
 */
export interface VaultDirectories {
  /** /Needs_Action - Tasks awaiting processing */
  needs_action: string;

  /** /Plans - Execution plans */
  plans: string;

  /** /Plans/pending - Awaiting approval */
  plans_pending: string;

  /** /Plans/approved - Human approved */
  plans_approved: string;

  /** /Plans/rejected - Human rejected */
  plans_rejected: string;

  /** /Accounting - Financial records */
  accounting: string;

  /** /Done - Completed tasks */
  done: string;

  /** /Done/invalid - Malformed files */
  done_invalid: string;

  /** /Done/failed - Failed tasks */
  done_failed: string;

  /** /Logs - Audit logs */
  logs: string;
}

/**
 * Vault configuration
 */
export interface VaultConfig {
  /** Root path to the vault */
  root_path: string;

  /** All vault directory paths */
  directories: VaultDirectories;
}

/**
 * Vault anomaly detected during verification
 */
export interface VaultAnomaly {
  type: 'missing_dir' | 'permission_error' | 'invalid_file';
  path: string;
  details: string;
}

/**
 * Vault health status
 */
export interface VaultStatus {
  /** Whether vault is healthy */
  healthy: boolean;

  /** Number of tasks in /Needs_Action */
  task_count: number;

  /** Number of plans awaiting approval */
  pending_approvals: number;

  /** Number of open error reports */
  errors_open: number;

  /** Timestamp of last activity (ISO 8601) */
  last_activity: string;
}

/**
 * Cognitive loop status
 */
export interface CognitiveLoopStatus {
  /** Whether loop is running */
  running: boolean;

  /** Number of tasks currently being processed */
  tasks_in_progress: number;

  /** Number of tasks waiting for approval */
  tasks_waiting_approval: number;

  /** Timestamp of last processed task (ISO 8601) */
  last_processed: string;

  /** Loop uptime in seconds */
  uptime_seconds: number;
}

/**
 * Application configuration
 */
export interface AppConfig {
  /** Vault configuration */
  vault: VaultConfig;

  /** Log level */
  log_level: 'debug' | 'info' | 'warn' | 'error';

  /** Approval polling interval in milliseconds */
  approval_poll_ms: number;

  /** Graceful shutdown timeout in milliseconds */
  graceful_shutdown_ms: number;
}
