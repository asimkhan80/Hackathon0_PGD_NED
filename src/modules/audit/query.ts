import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditEntry, AuditQueryResult } from '../../types/audit.js';
import { TaskState, Actor, Outcome } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';

/**
 * Parse a table row into an audit entry
 */
function parseTableRow(row: string, date: string): AuditEntry | null {
  // Remove leading/trailing pipes and split by |
  const cells = row
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

  if (cells.length < 7) return null;

  const [timestamp, taskId, from, to, actor, outcome, details] = cells;

  // Skip header rows
  if (timestamp === 'Timestamp' || timestamp.includes('---')) {
    return null;
  }

  // Reconstruct full timestamp
  const fullTimestamp = timestamp.includes('T')
    ? timestamp
    : `${date}T${timestamp}`;

  return {
    timestamp: fullTimestamp,
    task_id: taskId,
    state_from: from === '-' ? undefined : (from as TaskState),
    state_to: to as TaskState | string,
    actor: actor as Actor,
    outcome: outcome as Outcome,
    details: details || undefined,
    checksum: '', // Checksum would need to be recalculated
  };
}

/**
 * Parse audit log file content
 */
function parseLogFile(content: string, date: string): AuditEntry[] {
  const entries: AuditEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('|') && !line.includes('---')) {
      const entry = parseTableRow(line, date);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

/**
 * Get log file path for a date
 */
function getLogFilePath(date: string, config: VaultConfig): string {
  return join(config.directories.logs, `${date}.log.md`);
}

/**
 * Get entries for a specific task
 * @param taskId - Task UUID
 * @param config - Vault configuration
 * @returns Chronological list of entries
 */
export async function getByTaskId(
  taskId: string,
  config: VaultConfig
): Promise<AuditEntry[]> {
  const entries: AuditEntry[] = [];
  const shortId = taskId.slice(0, 8);

  try {
    const files = await readdir(config.directories.logs);
    const logFiles = files.filter((f) => f.endsWith('.log.md')).sort();

    for (const file of logFiles) {
      const date = file.replace('.log.md', '');
      const filePath = join(config.directories.logs, file);
      const content = await readFile(filePath, 'utf8');
      const fileEntries = parseLogFile(content, date);

      for (const entry of fileEntries) {
        if (entry.task_id === taskId || entry.task_id === shortId) {
          entries.push(entry);
        }
      }
    }
  } catch {
    // Logs directory may not exist
  }

  // Sort by timestamp
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return entries;
}

/**
 * Get entries for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @param config - Vault configuration
 * @returns All entries for that day
 */
export async function getByDate(
  date: string,
  config: VaultConfig
): Promise<AuditEntry[]> {
  const filePath = getLogFilePath(date, config);

  try {
    const content = await readFile(filePath, 'utf8');
    return parseLogFile(content, date);
  } catch {
    return [];
  }
}

/**
 * Get all entries (across all log files)
 */
export async function getAll(config: VaultConfig): Promise<AuditEntry[]> {
  const entries: AuditEntry[] = [];

  try {
    const files = await readdir(config.directories.logs);
    const logFiles = files.filter((f) => f.endsWith('.log.md')).sort();

    for (const file of logFiles) {
      const date = file.replace('.log.md', '');
      const filePath = join(config.directories.logs, file);
      const content = await readFile(filePath, 'utf8');
      const fileEntries = parseLogFile(content, date);
      entries.push(...fileEntries);
    }
  } catch {
    // Logs directory may not exist
  }

  return entries;
}

/**
 * Query entries with filters
 */
export async function query(
  config: VaultConfig,
  filters: {
    taskId?: string;
    date?: string;
    actor?: Actor;
    outcome?: Outcome;
    state?: TaskState;
  }
): Promise<AuditQueryResult> {
  let entries: AuditEntry[];

  // Get initial entries based on primary filter
  if (filters.date) {
    entries = await getByDate(filters.date, config);
  } else if (filters.taskId) {
    entries = await getByTaskId(filters.taskId, config);
  } else {
    entries = await getAll(config);
  }

  // Apply additional filters
  if (filters.actor) {
    entries = entries.filter((e) => e.actor === filters.actor);
  }

  if (filters.outcome) {
    entries = entries.filter((e) => e.outcome === filters.outcome);
  }

  if (filters.state) {
    entries = entries.filter(
      (e) => e.state_to === filters.state || e.state_from === filters.state
    );
  }

  return {
    entries,
    total: entries.length,
    date: filters.date,
    task_id: filters.taskId,
  };
}

/**
 * Get recent entries (last N entries)
 */
export async function getRecent(
  config: VaultConfig,
  limit = 100
): Promise<AuditEntry[]> {
  const entries = await getAll(config);
  return entries.slice(-limit);
}

/**
 * Count entries by outcome
 */
export async function countByOutcome(
  config: VaultConfig,
  date?: string
): Promise<Record<Outcome, number>> {
  const entries = date
    ? await getByDate(date, config)
    : await getAll(config);

  const counts: Record<Outcome, number> = {
    [Outcome.SUCCESS]: 0,
    [Outcome.FAILURE]: 0,
    [Outcome.PENDING]: 0,
  };

  for (const entry of entries) {
    counts[entry.outcome]++;
  }

  return counts;
}
