import type { Plan } from '../../types/plan.js';
import { ApprovalStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { getByTaskId, getParsedPlan } from './read.js';
import { countCheckboxes } from '../../lib/markdown.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if all steps are complete
 * @param taskId - Task UUID
 * @param config - Vault configuration
 * @returns true if all checkboxes are marked
 */
export async function isComplete(
  taskId: string,
  config: VaultConfig
): Promise<boolean> {
  const parsed = await getParsedPlan(taskId, config);
  if (!parsed) {
    return false;
  }

  const { completed, total } = countCheckboxes(parsed.content);
  return total > 0 && completed === total;
}

/**
 * Get completion progress
 */
export async function getProgress(
  taskId: string,
  config: VaultConfig
): Promise<{ completed: number; total: number; percentage: number }> {
  const parsed = await getParsedPlan(taskId, config);
  if (!parsed) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const { completed, total } = countCheckboxes(parsed.content);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Check if plan is ready for execution (approved or not required)
 */
export async function isReadyForExecution(
  taskId: string,
  config: VaultConfig
): Promise<boolean> {
  const plan = await getByTaskId(taskId, config);
  if (!plan) {
    return false;
  }

  return (
    plan.approval_status === ApprovalStatus.APPROVED ||
    plan.approval_status === ApprovalStatus.NOT_REQUIRED
  );
}

/**
 * Validate a plan for completeness and correctness
 */
export async function validate(
  taskId: string,
  config: VaultConfig
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const plan = await getByTaskId(taskId, config);
  if (!plan) {
    return {
      valid: false,
      errors: ['Plan not found'],
      warnings: [],
    };
  }

  // Check required fields
  if (!plan.task_id) {
    errors.push('Missing task_id');
  }

  if (!plan.created_at) {
    errors.push('Missing created_at');
  }

  if (!plan.approval_status) {
    errors.push('Missing approval_status');
  }

  // Check steps
  if (!plan.steps || plan.steps.length === 0) {
    errors.push('Plan must have at least one step');
  } else {
    // Check step numbering
    const stepIds = plan.steps.map((s) => s.step_id);
    const uniqueIds = new Set(stepIds);
    if (uniqueIds.size !== stepIds.length) {
      warnings.push('Duplicate step IDs detected');
    }

    // Check for empty descriptions
    for (const step of plan.steps) {
      if (!step.description || step.description.trim() === '') {
        errors.push(`Step ${step.step_id} has empty description`);
      }
    }
  }

  // Check approval status consistency
  if (plan.approval_status === ApprovalStatus.APPROVED && !plan.approved_at) {
    warnings.push('Plan is approved but missing approved_at timestamp');
  }

  if (plan.approval_status === ApprovalStatus.REJECTED && !plan.rejection_reason) {
    warnings.push('Plan is rejected but missing rejection_reason');
  }

  // Check completion status
  const allComplete = plan.steps.every((s) => s.completed);
  if (allComplete && !plan.completed_at) {
    warnings.push('All steps complete but missing completed_at timestamp');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if plan can be executed (approved and has steps)
 */
export function canExecute(plan: Plan): boolean {
  if (!plan.steps || plan.steps.length === 0) {
    return false;
  }

  return (
    plan.approval_status === ApprovalStatus.APPROVED ||
    plan.approval_status === ApprovalStatus.NOT_REQUIRED
  );
}

/**
 * Get next incomplete step
 */
export function getNextStep(plan: Plan): number | null {
  const incompleteStep = plan.steps.find((s) => !s.completed);
  return incompleteStep ? incompleteStep.step_id : null;
}
