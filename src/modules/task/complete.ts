import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';
import matter from 'gray-matter';
import type { Task, TaskFrontmatter } from '../../types/task.js';
import { TaskState, CompletionStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { TaskNotFoundError } from '../../lib/errors.js';
import { withLock } from '../../lib/filelock.js';
import { getFilePath, readFromFile } from './read.js';

/**
 * Get destination directory for completed task
 */
function getDestinationDir(
  status: CompletionStatus,
  config: VaultConfig
): string {
  switch (status) {
    case 'completed':
      return config.directories.done;
    case 'failed':
      return config.directories.done_failed;
    case 'invalid':
      return config.directories.done_invalid;
    case 'rejected':
      return config.directories.done;
    default:
      return config.directories.done;
  }
}

/**
 * Complete a task and move it to /Done
 * @param id - Task UUID
 * @param status - Final status
 * @param config - Vault configuration
 * @param notes - Optional completion notes
 */
export async function complete(
  id: string,
  status: CompletionStatus,
  config: VaultConfig,
  notes?: string
): Promise<void> {
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  await withLock(filePath, async () => {
    // Read current content
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as TaskFrontmatter & {
      completed_at?: string;
      completion_status?: CompletionStatus;
      completion_notes?: string;
    };

    // Update frontmatter
    frontmatter.current_state = TaskState.CLOSE;
    frontmatter.completed_at = new Date().toISOString();
    frontmatter.completion_status = status;
    if (notes) {
      frontmatter.completion_notes = notes;
    }

    // Append completion notes to body
    let updatedBody = body;
    if (notes) {
      updatedBody += `\n\n## Completion Notes\n\n${notes}\n`;
    }

    // Write updated content
    const updatedContent = matter.stringify(updatedBody, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    // Move to destination directory
    const destDir = getDestinationDir(status, config);
    const destPath = join(destDir, basename(filePath));

    await rename(filePath, destPath);
  });
}

/**
 * Mark task as failed with error details
 * @param id - Task UUID
 * @param error - Error message
 * @param config - Vault configuration
 */
export async function fail(
  id: string,
  error: string,
  config: VaultConfig
): Promise<void> {
  await complete(id, 'failed', config, `Error: ${error}`);
}

/**
 * Mark task as invalid
 * @param id - Task UUID
 * @param reason - Reason for invalidity
 * @param config - Vault configuration
 */
export async function invalidate(
  id: string,
  reason: string,
  config: VaultConfig
): Promise<void> {
  await complete(id, 'invalid', config, `Invalid: ${reason}`);
}

/**
 * Mark task as rejected
 * @param id - Task UUID
 * @param reason - Rejection reason
 * @param config - Vault configuration
 */
export async function reject(
  id: string,
  reason: string,
  config: VaultConfig
): Promise<void> {
  await complete(id, 'rejected', config, `Rejected: ${reason}`);
}

/**
 * Archive a task without status change (for cleanup)
 * @param id - Task UUID
 * @param config - Vault configuration
 */
export async function archive(
  id: string,
  config: VaultConfig
): Promise<void> {
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  const destPath = join(config.directories.done, basename(filePath));
  await rename(filePath, destPath);
}

/**
 * Delete a task completely (use with caution)
 * @param id - Task UUID
 * @param config - Vault configuration
 */
export async function deleteTask(
  id: string,
  config: VaultConfig
): Promise<void> {
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  await unlink(filePath);
}

/**
 * Reopen a completed task (move back to Needs_Action)
 * @param id - Task UUID
 * @param config - Vault configuration
 * @returns Reopened task
 */
export async function reopen(
  id: string,
  config: VaultConfig
): Promise<Task> {
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  return withLock(filePath, async () => {
    // Read current content
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as TaskFrontmatter;

    // Reset state
    frontmatter.current_state = TaskState.WATCH;
    delete (frontmatter as unknown as Record<string, unknown>).completed_at;
    delete (frontmatter as unknown as Record<string, unknown>).completion_status;
    delete (frontmatter as unknown as Record<string, unknown>).completion_notes;

    // Write updated content
    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    // Move to Needs_Action
    const destPath = join(config.directories.needs_action, basename(filePath));
    await rename(filePath, destPath);

    return readFromFile(destPath);
  });
}
