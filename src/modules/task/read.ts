import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Task, TaskFrontmatter } from '../../types/task.js';
import { TaskState, TaskSource, Priority } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { TaskNotFoundError } from '../../lib/errors.js';

/**
 * Parse a task from file content
 */
function parseTask(content: string): Task {
  const { data, content: body } = matter(content);
  const frontmatter = data as TaskFrontmatter;

  return {
    id: frontmatter.id,
    title: frontmatter.title || 'Untitled',
    source: frontmatter.source || TaskSource.MANUAL,
    created_at: frontmatter.created_at || new Date().toISOString(),
    current_state: frontmatter.current_state || TaskState.WATCH,
    priority: frontmatter.priority || Priority.NORMAL,
    requires_approval: frontmatter.requires_approval ?? false,
    plan_path: frontmatter.plan_path,
    error_count: frontmatter.error_count,
    last_error: frontmatter.last_error,
    raw_content: body,
  };
}

/**
 * Find task file by ID across vault directories
 */
async function findTaskFile(
  id: string,
  config: VaultConfig
): Promise<string | null> {
  const { directories } = config;

  // Directories where tasks can be
  const searchDirs = [
    directories.needs_action,
    directories.done,
    directories.done_failed,
    directories.done_invalid,
  ];

  for (const dir of searchDirs) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.md') && file.includes(id.slice(0, 8))) {
          const filePath = join(dir, file);
          const content = await readFile(filePath, 'utf8');
          const { data } = matter(content);
          if (data.id === id) {
            return filePath;
          }
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  return null;
}

/**
 * Get task by ID
 * @param id - Task UUID
 * @param config - Vault configuration
 * @returns Task or null if not found
 */
export async function getById(
  id: string,
  config: VaultConfig
): Promise<Task | null> {
  const filePath = await findTaskFile(id, config);
  if (!filePath) {
    return null;
  }

  const content = await readFile(filePath, 'utf8');
  return parseTask(content);
}

/**
 * Get task by ID, throwing if not found
 * @param id - Task UUID
 * @param config - Vault configuration
 * @returns Task
 * @throws TaskNotFoundError if task doesn't exist
 */
export async function getByIdOrThrow(
  id: string,
  config: VaultConfig
): Promise<Task> {
  const task = await getById(id, config);
  if (!task) {
    throw new TaskNotFoundError(id);
  }
  return task;
}

/**
 * List tasks in a given state
 * @param state - Filter by state
 * @param config - Vault configuration
 * @returns Array of tasks
 */
export async function listByState(
  state: TaskState,
  config: VaultConfig
): Promise<Task[]> {
  const { directories } = config;
  const tasks: Task[] = [];

  // Determine which directory to search based on state
  let searchDirs: string[];
  if (state === TaskState.CLOSE) {
    searchDirs = [directories.done, directories.done_failed, directories.done_invalid];
  } else {
    searchDirs = [directories.needs_action];
  }

  for (const dir of searchDirs) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.md') && !file.startsWith('ERROR_')) {
          try {
            const filePath = join(dir, file);
            const content = await readFile(filePath, 'utf8');
            const task = parseTask(content);
            if (task.current_state === state) {
              tasks.push(task);
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  return tasks;
}

/**
 * List all active tasks (not in CLOSE state)
 * @param config - Vault configuration
 * @returns Array of active tasks
 */
export async function listActive(config: VaultConfig): Promise<Task[]> {
  const { directories } = config;
  const tasks: Task[] = [];

  try {
    const files = await readdir(directories.needs_action);
    for (const file of files) {
      if (file.endsWith('.md') && !file.startsWith('ERROR_')) {
        try {
          const filePath = join(directories.needs_action, file);
          const content = await readFile(filePath, 'utf8');
          const task = parseTask(content);
          if (task.current_state !== TaskState.CLOSE) {
            tasks.push(task);
          }
        } catch {
          // Skip invalid files
        }
      }
    }
  } catch {
    // Directory may not exist
  }

  return tasks;
}

/**
 * Get task file path by ID
 * @param id - Task UUID
 * @param config - Vault configuration
 * @returns File path or null
 */
export async function getFilePath(
  id: string,
  config: VaultConfig
): Promise<string | null> {
  return findTaskFile(id, config);
}

/**
 * Read task from a specific file path
 * @param filePath - Path to task file
 * @returns Parsed task
 */
export async function readFromFile(filePath: string): Promise<Task> {
  const content = await readFile(filePath, 'utf8');
  return parseTask(content);
}
