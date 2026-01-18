import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditIntegrityResult } from '../../types/audit.js';
import type { VaultConfig } from '../../types/config.js';
import { checksumEntry } from '../../lib/checksum.js';
import { getByDate } from './query.js';

/**
 * Get log file path for a date
 */
function getLogFilePath(date: string, config: VaultConfig): string {
  return join(config.directories.logs, `${date}.log.md`);
}

/**
 * Verify integrity of a log file for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @param config - Vault configuration
 * @returns true if all checksums are valid
 */
export async function verifyIntegrity(
  date: string,
  config: VaultConfig
): Promise<boolean> {
  const result = await verifyIntegrityDetailed(date, config);
  return result.valid;
}

/**
 * Verify integrity with detailed results
 */
export async function verifyIntegrityDetailed(
  date: string,
  config: VaultConfig
): Promise<AuditIntegrityResult> {
  const entries = await getByDate(date, config);
  const invalidEntries: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Skip entries without checksum (legacy or manually added)
    if (!entry.checksum) {
      continue;
    }

    // Verify checksum
    const { checksum, ...entryWithoutChecksum } = entry;
    const expectedChecksum = checksumEntry(
      entryWithoutChecksum as Record<string, unknown>
    );

    if (expectedChecksum !== checksum) {
      invalidEntries.push(i);
      errors.push(
        `Entry ${i}: checksum mismatch (expected ${expectedChecksum.slice(0, 8)}, got ${checksum.slice(0, 8)})`
      );
    }
  }

  // Verify monotonic timestamps
  for (let i = 1; i < entries.length; i++) {
    const prev = new Date(entries[i - 1].timestamp);
    const curr = new Date(entries[i].timestamp);

    if (curr < prev) {
      errors.push(
        `Entry ${i}: timestamp not monotonic (${entries[i].timestamp} < ${entries[i - 1].timestamp})`
      );
    }
  }

  return {
    valid: invalidEntries.length === 0 && errors.length === 0,
    date,
    total_entries: entries.length,
    invalid_entries: invalidEntries,
    errors,
  };
}

/**
 * Verify all log files
 */
export async function verifyAllLogs(
  config: VaultConfig
): Promise<Map<string, AuditIntegrityResult>> {
  const results = new Map<string, AuditIntegrityResult>();

  try {
    const files = await readdir(config.directories.logs);
    const logFiles = files.filter((f) => f.endsWith('.log.md'));

    for (const file of logFiles) {
      const date = file.replace('.log.md', '');
      const result = await verifyIntegrityDetailed(date, config);
      results.set(date, result);
    }
  } catch {
    // Logs directory may not exist
  }

  return results;
}

/**
 * Check if log file exists
 */
export async function logExists(
  date: string,
  config: VaultConfig
): Promise<boolean> {
  try {
    const filePath = getLogFilePath(date, config);
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of all log dates
 */
export async function getLogDates(config: VaultConfig): Promise<string[]> {
  try {
    const files = await readdir(config.directories.logs);
    return files
      .filter((f) => f.endsWith('.log.md'))
      .map((f) => f.replace('.log.md', ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Get integrity summary for all logs
 */
export async function getIntegritySummary(
  config: VaultConfig
): Promise<{
  total_files: number;
  valid_files: number;
  invalid_files: number;
  total_entries: number;
  invalid_entries: number;
}> {
  const results = await verifyAllLogs(config);

  let totalFiles = 0;
  let validFiles = 0;
  let totalEntries = 0;
  let invalidEntries = 0;

  for (const result of results.values()) {
    totalFiles++;
    totalEntries += result.total_entries;
    invalidEntries += result.invalid_entries.length;

    if (result.valid) {
      validFiles++;
    }
  }

  return {
    total_files: totalFiles,
    valid_files: validFiles,
    invalid_files: totalFiles - validFiles,
    total_entries: totalEntries,
    invalid_entries: invalidEntries,
  };
}
