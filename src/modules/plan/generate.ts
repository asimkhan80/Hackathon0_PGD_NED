import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Task } from '../../types/task.js';
import type { Plan, PlanStep, PlanFrontmatter } from '../../types/plan.js';
import { ApprovalStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { withLock } from '../../lib/filelock.js';
import { getApprovalReasons } from '../task/approval.js';

/**
 * Options for plan generation
 */
export interface GeneratePlanOptions {
  /** Step descriptions */
  steps: string[];
  /** Override approval requirement */
  requiresApproval?: boolean;
  /** Additional context to include */
  context?: string;
}

/**
 * Generate plan filename
 */
function generateFilename(taskId: string): string {
  return `${taskId.slice(0, 8)}-plan.md`;
}

/**
 * Build plan markdown content
 */
function buildPlanContent(
  task: Task,
  steps: PlanStep[],
  requiresApproval: boolean
): string {
  const lines: string[] = [];

  lines.push(`# Plan: ${task.title}`);
  lines.push('');

  // Approval section if required
  if (requiresApproval) {
    const reasons = getApprovalReasons(task);
    lines.push('## Approval Required');
    lines.push('');
    if (reasons.length > 0) {
      lines.push('This task requires approval because:');
      for (const reason of reasons) {
        lines.push(`- ${reason}`);
      }
    } else {
      lines.push('This task requires human approval before execution.');
    }
    lines.push('');
    lines.push('**To approve:** Move this file to `/Plans/approved/`');
    lines.push('**To reject:** Move this file to `/Plans/rejected/`');
    lines.push('');
  }

  // Steps section
  lines.push('## Steps');
  lines.push('');
  for (const step of steps) {
    const checkbox = step.completed ? '[x]' : '[ ]';
    lines.push(`- ${checkbox} ${step.step_id}. ${step.description}`);
  }
  lines.push('');

  // Risk assessment placeholder
  lines.push('## Risk Assessment');
  lines.push('');
  lines.push('- **Reversibility:** [To be determined]');
  lines.push('- **Impact:** [To be determined]');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a plan for a task
 * @param task - Task to create plan for
 * @param options - Plan options including steps
 * @param config - Vault configuration
 * @returns Created plan
 */
export async function generate(
  task: Task,
  options: GeneratePlanOptions,
  config: VaultConfig
): Promise<Plan> {
  const now = new Date().toISOString();
  const requiresApproval = options.requiresApproval ?? task.requires_approval;

  // Create step objects
  const steps: PlanStep[] = options.steps.map((description, index) => ({
    step_id: index + 1,
    description,
    completed: false,
  }));

  // Determine initial approval status
  const approvalStatus = requiresApproval
    ? ApprovalStatus.PENDING
    : ApprovalStatus.NOT_REQUIRED;

  // Build frontmatter
  const frontmatter: PlanFrontmatter = {
    task_id: task.id,
    approval_status: approvalStatus,
    created_at: now,
  };

  // Build content
  const content = buildPlanContent(task, steps, requiresApproval);

  // Generate file content
  const fileContent = matter.stringify(content, frontmatter);

  // Determine file path
  const filename = generateFilename(task.id);
  const filePath = requiresApproval
    ? join(config.directories.plans_pending, filename)
    : join(config.directories.plans, filename);

  // Write file
  await withLock(filePath, async () => {
    await writeFile(filePath, fileContent, 'utf8');
  });

  // Return plan object
  return {
    task_id: task.id,
    steps,
    approval_status: approvalStatus,
    created_at: now,
  };
}

/**
 * Generate default steps based on task content
 * This is a placeholder - in production, this would use AI
 */
export function generateDefaultSteps(_task: Task): string[] {
  const steps: string[] = [];

  // Basic steps based on task content
  steps.push('Review task requirements');
  steps.push('Prepare necessary resources');
  steps.push('Execute primary action');
  steps.push('Verify results');
  steps.push('Document completion');

  return steps;
}

/**
 * Get plan file path for a task
 */
export function getPlanPath(taskId: string, config: VaultConfig): string {
  const filename = generateFilename(taskId);
  return join(config.directories.plans, filename);
}

/**
 * Get pending plan file path for a task
 */
export function getPendingPlanPath(taskId: string, config: VaultConfig): string {
  const filename = generateFilename(taskId);
  return join(config.directories.plans_pending, filename);
}
