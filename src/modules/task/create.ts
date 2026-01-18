import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Task, TaskFrontmatter } from '../../types/task.js';
import { TaskSource, TaskState, Priority } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { withLock } from '../../lib/filelock.js';

/**
 * Options for creating a task
 */
export interface CreateTaskOptions {
  /** Raw content of the task */
  content: string;
  /** Which watcher created this task */
  source: TaskSource;
  /** Optional title (extracted from content if not provided) */
  title?: string;
  /** Optional priority (default: normal) */
  priority?: Priority;
}

/**
 * Extract title from markdown content
 * Looks for first H1 heading or first line
 */
function extractTitle(content: string): string {
  // Try to find H1 heading
  const h1Match = /^#\s+(.+)$/m.exec(content);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fall back to first non-empty line
  const firstLine = content.split('\n').find((line) => line.trim());
  if (firstLine) {
    return firstLine.trim().slice(0, 100); // Limit length
  }

  return 'Untitled Task';
}

/**
 * Determine if task requires approval based on content
 * Article IV criteria: payments, new recipients, legal/emotional, social media, external deletions
 */
function checkRequiresApproval(content: string, _source: TaskSource): boolean {
  const lowerContent = content.toLowerCase();

  // Keywords that indicate approval is needed
  const approvalKeywords = [
    // Financial
    'payment', 'pay', 'transfer', 'invoice', 'money', 'amount', '$',
    'charge', 'refund', 'reimburse',
    // Communication
    'email', 'send', 'reply', 'message', 'contact', 'reach out',
    // Social
    'post', 'tweet', 'publish', 'share', 'social media',
    // Legal/Sensitive
    'legal', 'contract', 'agreement', 'sign', 'commit',
    // Destructive
    'delete', 'remove', 'cancel', 'terminate',
  ];

  for (const keyword of approvalKeywords) {
    if (lowerContent.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate task filename
 */
function generateFilename(id: string, title: string): string {
  // Sanitize title for filename
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return `task_${id.slice(0, 8)}_${safeTitle}.md`;
}

/**
 * Create a new task from incoming content
 * @param options - Task creation options
 * @param config - Vault configuration
 * @returns Created task
 */
export async function create(
  options: CreateTaskOptions,
  config: VaultConfig
): Promise<Task> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const title = options.title || extractTitle(options.content);
  const requiresApproval = checkRequiresApproval(options.content, options.source);

  const task: Task = {
    id,
    title,
    source: options.source,
    created_at: now,
    current_state: TaskState.WATCH,
    priority: options.priority || Priority.NORMAL,
    requires_approval: requiresApproval,
    raw_content: options.content,
  };

  // Generate frontmatter
  const frontmatter: TaskFrontmatter = {
    id: task.id,
    title: task.title,
    source: task.source,
    created_at: task.created_at,
    current_state: task.current_state,
    priority: task.priority,
    requires_approval: task.requires_approval,
  };

  // Build file content
  const fileContent = matter.stringify(
    `# Task: ${title}\n\n## Original Content\n\n${options.content}\n`,
    frontmatter
  );

  // Write to Needs_Action directory
  const filename = generateFilename(id, title);
  const filePath = join(config.directories.needs_action, filename);

  await withLock(filePath, async () => {
    await writeFile(filePath, fileContent, 'utf8');
  });

  return task;
}

/**
 * Create a task from an existing file (already in vault)
 * @param filePath - Path to existing task file
 * @param config - Vault configuration
 * @returns Parsed task
 */
export async function createFromFile(
  filePath: string,
  config: VaultConfig
): Promise<Task> {
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(filePath, 'utf8');

  const { data, content: body } = matter(content);
  const frontmatter = data as TaskFrontmatter;

  // If no ID, generate one and update file
  if (!frontmatter.id) {
    const newTask = await create(
      {
        content: body,
        source: frontmatter.source || TaskSource.MANUAL,
        title: frontmatter.title,
        priority: frontmatter.priority,
      },
      config
    );

    // Delete original file
    const { unlink } = await import('node:fs/promises');
    await unlink(filePath);

    return newTask;
  }

  return {
    id: frontmatter.id,
    title: frontmatter.title || extractTitle(body),
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
