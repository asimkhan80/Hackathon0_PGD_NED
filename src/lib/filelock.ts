import * as lockfile from 'proper-lockfile';
import { FileLockError } from './errors.js';

/**
 * Lock options for file operations
 */
export interface LockOptions {
  /** Number of retries before giving up (default: 3) */
  retries?: number;
  /** Stale lock threshold in ms (default: 10000) */
  stale?: number;
  /** Update interval for lock in ms (default: 5000) */
  update?: number;
}

/**
 * Release function returned by acquireLock
 */
export type ReleaseFn = () => Promise<void>;

const DEFAULT_OPTIONS: LockOptions = {
  retries: 3,
  stale: 10000,
  update: 5000,
};

/**
 * Acquire a lock on a file
 * @param filePath - Path to file to lock
 * @param options - Lock options
 * @returns Release function to call when done
 * @throws FileLockError if lock cannot be acquired
 */
export async function acquireLock(
  filePath: string,
  options: LockOptions = {}
): Promise<ReleaseFn> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const release = await lockfile.lock(filePath, {
      retries: opts.retries,
      stale: opts.stale,
      update: opts.update,
      realpath: false, // Don't resolve symlinks
    });

    return async () => {
      try {
        await release();
      } catch (error) {
        // Ignore errors when releasing (lock may have been compromised)
        console.warn(`Warning: Error releasing lock for ${filePath}:`, error);
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown lock error';
    throw new FileLockError(`Failed to acquire lock: ${message}`, filePath);
  }
}

/**
 * Release a lock on a file (standalone function)
 * Note: Prefer using the release function returned by acquireLock
 * @param filePath - Path to file to unlock
 */
export async function releaseLock(filePath: string): Promise<void> {
  try {
    await lockfile.unlock(filePath, { realpath: false });
  } catch (error) {
    // Ignore errors - lock may not exist or already released
    console.warn(`Warning: Error releasing lock for ${filePath}:`, error);
  }
}

/**
 * Check if a file is currently locked
 * @param filePath - Path to file to check
 * @returns true if file is locked
 */
export async function isLocked(filePath: string): Promise<boolean> {
  try {
    return await lockfile.check(filePath, { realpath: false });
  } catch {
    return false;
  }
}

/**
 * Execute a function while holding a lock on a file
 * Automatically releases lock when done (even on error)
 * @param filePath - Path to file to lock
 * @param fn - Async function to execute while holding lock
 * @param options - Lock options
 * @returns Result of fn
 * @throws FileLockError if lock cannot be acquired
 */
export async function withLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const release = await acquireLock(filePath, options);

  try {
    return await fn();
  } finally {
    await release();
  }
}

/**
 * Execute a function with locks on multiple files
 * Locks are acquired in order and released in reverse order
 * @param filePaths - Paths to files to lock
 * @param fn - Async function to execute while holding locks
 * @param options - Lock options
 * @returns Result of fn
 */
export async function withLocks<T>(
  filePaths: string[],
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const releases: ReleaseFn[] = [];

  try {
    // Acquire locks in order
    for (const filePath of filePaths) {
      const release = await acquireLock(filePath, options);
      releases.push(release);
    }

    return await fn();
  } finally {
    // Release in reverse order
    for (const release of releases.reverse()) {
      await release();
    }
  }
}
