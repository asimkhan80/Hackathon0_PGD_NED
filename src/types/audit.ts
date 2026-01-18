import { TaskState, Actor, Outcome } from './enums.js';

/**
 * Audit entry - immutable record of system activity
 * Storage: Append-only markdown files in /Logs (daily rotation)
 */
export interface AuditEntry {
  /** When event occurred (ISO 8601) */
  timestamp: string;

  /** Related task UUID (or "SYSTEM" for global events) */
  task_id: string;

  /** Previous state (null for new tasks) */
  state_from?: TaskState;

  /** New state or event type */
  state_to: TaskState | string;

  /** Who performed the action */
  actor: Actor;

  /** Result of the action */
  outcome: Outcome;

  /** Additional context */
  details?: string;

  /** SHA-256 of entry for integrity verification */
  checksum: string;
}

/**
 * Audit entry without checksum (for logging input)
 */
export type AuditEntryInput = Omit<AuditEntry, 'checksum'>;

/**
 * Audit log file header
 */
export interface AuditLogHeader {
  date: string;
  entries_count: number;
  last_modified: string;
}

/**
 * Audit query result
 */
export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
  date?: string;
  task_id?: string;
}

/**
 * Audit integrity check result
 */
export interface AuditIntegrityResult {
  valid: boolean;
  date: string;
  total_entries: number;
  invalid_entries: number[];
  errors: string[];
}
