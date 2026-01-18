import { writeFile, appendFile, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditEntry, AuditEntryInput } from '../../types/audit.js';
import { TaskState, Actor, Outcome } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { checksumEntry } from '../../lib/checksum.js';
import { withLock } from '../../lib/filelock.js';
import { tableRow } from '../../lib/markdown.js';

/**
 * Get log file path for a date
 */
function getLogFilePath(date: string, config: VaultConfig): string {
  return join(config.directories.logs, `${date}.log.md`);
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format timestamp for display (HH:MM:SSZ)
 */
function formatTimestamp(isoTimestamp: string): string {
  return isoTimestamp.split('T')[1]?.replace(/\.\d{3}Z$/, 'Z') || isoTimestamp;
}

/**
 * Check if log file exists
 */
async function logFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create log file header
 */
function createLogHeader(date: string): string {
  return `# Audit Log: ${date}

| Timestamp | Task ID | From | To | Actor | Outcome | Details |
|-----------|---------|------|-----|-------|---------|---------|
`;
}

/**
 * Format entry as table row
 */
function formatEntryRow(entry: AuditEntry): string {
  const timestamp = formatTimestamp(entry.timestamp);
  const taskId = entry.task_id.slice(0, 8);
  const from = entry.state_from || '-';
  const to = entry.state_to;
  const actor = entry.actor;
  const outcome = entry.outcome;
  const details = entry.details || '';

  return tableRow([timestamp, taskId, from, to, actor, outcome, details]);
}

/**
 * Append audit entry to log (cannot modify past entries)
 * @param entry - Entry to log (checksum auto-generated)
 * @param config - Vault configuration
 */
export async function log(
  entry: AuditEntryInput,
  config: VaultConfig
): Promise<AuditEntry> {
  const date = getTodayDate();
  const filePath = getLogFilePath(date, config);

  // Generate checksum
  const fullEntry: AuditEntry = {
    ...entry,
    checksum: checksumEntry(entry as Record<string, unknown>),
  };

  return withLock(filePath, async () => {
    // Create file if it doesn't exist
    if (!(await logFileExists(filePath))) {
      await writeFile(filePath, createLogHeader(date), 'utf8');
    }

    // Append entry row
    const row = formatEntryRow(fullEntry);
    await appendFile(filePath, row + '\n', 'utf8');

    return fullEntry;
  });
}

/**
 * Log a state transition
 */
export async function logStateTransition(
  taskId: string,
  from: AuditEntryInput['state_from'],
  to: AuditEntryInput['state_to'],
  actor: AuditEntryInput['actor'],
  outcome: AuditEntryInput['outcome'],
  config: VaultConfig,
  details?: string
): Promise<AuditEntry> {
  return log(
    {
      timestamp: new Date().toISOString(),
      task_id: taskId,
      state_from: from,
      state_to: to,
      actor,
      outcome,
      details,
    },
    config
  );
}

/**
 * Log a system event (not task-specific)
 */
export async function logSystemEvent(
  event: string,
  outcome: AuditEntryInput['outcome'],
  config: VaultConfig,
  details?: string
): Promise<AuditEntry> {
  return log(
    {
      timestamp: new Date().toISOString(),
      task_id: 'SYSTEM',
      state_to: event,
      actor: Actor.SYSTEM,
      outcome,
      details,
    },
    config
  );
}

/**
 * Log task creation
 */
export async function logTaskCreated(
  taskId: string,
  source: string,
  config: VaultConfig
): Promise<AuditEntry> {
  return logStateTransition(
    taskId,
    undefined,
    TaskState.WATCH,
    Actor.SYSTEM,
    Outcome.SUCCESS,
    config,
    `Task created from ${source}`
  );
}

/**
 * Log task completion
 */
export async function logTaskCompleted(
  taskId: string,
  status: string,
  config: VaultConfig
): Promise<AuditEntry> {
  return logStateTransition(
    taskId,
    TaskState.LOG,
    TaskState.CLOSE,
    Actor.SYSTEM,
    status === 'completed' ? Outcome.SUCCESS : Outcome.FAILURE,
    config,
    `Task ${status}`
  );
}

/**
 * Log approval event
 */
export async function logApproval(
  taskId: string,
  approved: boolean,
  config: VaultConfig,
  approvedBy?: string
): Promise<AuditEntry> {
  return logStateTransition(
    taskId,
    TaskState.APPROVE,
    approved ? TaskState.ACT : TaskState.CLOSE,
    Actor.HUMAN,
    approved ? Outcome.SUCCESS : Outcome.FAILURE,
    config,
    approved
      ? `Approved${approvedBy ? ` by ${approvedBy}` : ''}`
      : 'Plan rejected'
  );
}
