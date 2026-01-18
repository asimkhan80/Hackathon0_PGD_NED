import { rename, readFile, writeFile, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Plan, PlanFrontmatter } from '../../types/plan.js';
import { ApprovalStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { PlanValidationError } from '../../lib/errors.js';
import { withLock } from '../../lib/filelock.js';
import { getFilePath, getByTaskId } from './read.js';

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get plan filename from task ID
 */
function getPlanFilename(taskId: string): string {
  return `${taskId.slice(0, 8)}-plan.md`;
}

/**
 * Submit plan for approval
 * Moves plan file to /Plans/pending
 * @param taskId - Task UUID
 * @param config - Vault configuration
 */
export async function submitForApproval(
  taskId: string,
  config: VaultConfig
): Promise<void> {
  const currentPath = await getFilePath(taskId, config);
  if (!currentPath) {
    throw new PlanValidationError(`Plan not found for task: ${taskId}`, taskId);
  }

  const filename = getPlanFilename(taskId);
  const pendingPath = join(config.directories.plans_pending, filename);

  // Update frontmatter
  await withLock(currentPath, async () => {
    const content = await readFile(currentPath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as PlanFrontmatter;

    frontmatter.approval_status = ApprovalStatus.PENDING;

    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(currentPath, updatedContent, 'utf8');

    // Move to pending folder
    await rename(currentPath, pendingPath);
  });
}

/**
 * Check approval status by detecting file location
 * @param taskId - Task UUID
 * @param config - Vault configuration
 * @returns Current approval status
 */
export async function checkApprovalStatus(
  taskId: string,
  config: VaultConfig
): Promise<ApprovalStatus> {
  const filename = getPlanFilename(taskId);
  const { directories } = config;

  // Check each location in priority order
  if (await fileExists(join(directories.plans_approved, filename))) {
    return ApprovalStatus.APPROVED;
  }

  if (await fileExists(join(directories.plans_rejected, filename))) {
    return ApprovalStatus.REJECTED;
  }

  if (await fileExists(join(directories.plans_pending, filename))) {
    return ApprovalStatus.PENDING;
  }

  // Plan exists in main plans folder - not requiring approval
  if (await fileExists(join(directories.plans, filename))) {
    return ApprovalStatus.NOT_REQUIRED;
  }

  // Plan not found - default to not required
  return ApprovalStatus.NOT_REQUIRED;
}

/**
 * Mark plan as approved
 * Used when plan is moved to approved folder
 */
export async function markApproved(
  taskId: string,
  approvedBy: string,
  config: VaultConfig
): Promise<Plan> {
  const filename = getPlanFilename(taskId);
  const approvedPath = join(config.directories.plans_approved, filename);

  if (!(await fileExists(approvedPath))) {
    throw new PlanValidationError(
      `Approved plan not found for task: ${taskId}`,
      taskId
    );
  }

  await withLock(approvedPath, async () => {
    const content = await readFile(approvedPath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as PlanFrontmatter;

    frontmatter.approval_status = ApprovalStatus.APPROVED;
    frontmatter.approved_at = new Date().toISOString();
    frontmatter.approved_by = approvedBy;

    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(approvedPath, updatedContent, 'utf8');
  });

  const plan = await getByTaskId(taskId, config);
  if (!plan) {
    throw new PlanValidationError(`Failed to read updated plan`, taskId);
  }
  return plan;
}

/**
 * Mark plan as rejected
 * Used when plan is moved to rejected folder
 */
export async function markRejected(
  taskId: string,
  reason: string,
  config: VaultConfig
): Promise<Plan> {
  const filename = getPlanFilename(taskId);
  const rejectedPath = join(config.directories.plans_rejected, filename);

  if (!(await fileExists(rejectedPath))) {
    throw new PlanValidationError(
      `Rejected plan not found for task: ${taskId}`,
      taskId
    );
  }

  await withLock(rejectedPath, async () => {
    const content = await readFile(rejectedPath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as PlanFrontmatter;

    frontmatter.approval_status = ApprovalStatus.REJECTED;
    frontmatter.rejection_reason = reason;

    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(rejectedPath, updatedContent, 'utf8');
  });

  const plan = await getByTaskId(taskId, config);
  if (!plan) {
    throw new PlanValidationError(`Failed to read updated plan`, taskId);
  }
  return plan;
}

/**
 * Create a reminder for stale pending plans
 * @param taskId - Task UUID
 * @param hoursStale - Hours since submission
 * @param config - Vault configuration
 */
export async function createApprovalReminder(
  taskId: string,
  hoursStale: number,
  config: VaultConfig
): Promise<void> {
  const reminderContent = `---
type: reminder
task_id: ${taskId}
created_at: ${new Date().toISOString()}
---

# Approval Reminder

A plan has been waiting for approval for **${hoursStale} hours**.

**Task ID:** ${taskId}

## Action Required

Please review and approve or reject the plan:

1. Go to \`/Plans/pending/\`
2. Find the plan for task \`${taskId.slice(0, 8)}\`
3. Review the plan contents
4. Move to \`/Plans/approved/\` to approve
5. Move to \`/Plans/rejected/\` to reject

---
*This reminder was automatically generated.*
`;

  const reminderPath = join(
    config.directories.needs_action,
    `REMINDER_${taskId.slice(0, 8)}_approval.md`
  );

  await writeFile(reminderPath, reminderContent, 'utf8');
}

/**
 * Check for stale pending plans (older than threshold)
 */
export async function checkStalePending(
  config: VaultConfig,
  thresholdHours = 24
): Promise<Array<{ taskId: string; hoursStale: number }>> {
  const pending = await import('./read.js').then((m) =>
    m.listByStatus(ApprovalStatus.PENDING, config)
  );

  const now = Date.now();
  const stale: Array<{ taskId: string; hoursStale: number }> = [];

  for (const plan of pending) {
    const createdAt = new Date(plan.created_at).getTime();
    const hoursStale = Math.floor((now - createdAt) / (1000 * 60 * 60));

    if (hoursStale >= thresholdHours) {
      stale.push({ taskId: plan.task_id, hoursStale });
    }
  }

  return stale;
}
