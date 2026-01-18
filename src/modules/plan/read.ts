import { readFile, readdir, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Plan, PlanStep, PlanFrontmatter, ParsedPlanFile } from '../../types/plan.js';
import { ApprovalStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { parseCheckboxes } from '../../lib/markdown.js';

/**
 * Parse steps from markdown content
 */
function parseSteps(content: string): PlanStep[] {
  const checkboxes = parseCheckboxes(content);

  return checkboxes.map((cb, index) => {
    // Extract step number from text (e.g., "1. Do something")
    const stepMatch = /^(\d+)\.\s*(.+)$/.exec(cb.text);
    const stepId = stepMatch ? parseInt(stepMatch[1], 10) : index + 1;
    const description = stepMatch ? stepMatch[2] : cb.text;

    return {
      step_id: stepId,
      description,
      completed: cb.checked,
    };
  });
}

/**
 * Parse a plan from file content
 */
function parsePlan(content: string, filePath: string): ParsedPlanFile {
  const { data, content: body } = matter(content);
  const frontmatter = data as PlanFrontmatter;
  const steps = parseSteps(body);

  return {
    frontmatter,
    steps,
    content: body,
    filePath,
  };
}

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
 * Find plan file for a task across all plan directories
 */
async function findPlanFile(
  taskId: string,
  config: VaultConfig
): Promise<string | null> {
  const filename = `${taskId.slice(0, 8)}-plan.md`;
  const { directories } = config;

  // Check all possible locations
  const possiblePaths = [
    join(directories.plans, filename),
    join(directories.plans_pending, filename),
    join(directories.plans_approved, filename),
    join(directories.plans_rejected, filename),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get plan by task ID
 * @param taskId - Task UUID
 * @param config - Vault configuration
 * @returns Plan or null if not found
 */
export async function getByTaskId(
  taskId: string,
  config: VaultConfig
): Promise<Plan | null> {
  const filePath = await findPlanFile(taskId, config);
  if (!filePath) {
    return null;
  }

  const content = await readFile(filePath, 'utf8');
  const parsed = parsePlan(content, filePath);

  return {
    task_id: parsed.frontmatter.task_id,
    steps: parsed.steps,
    approval_status: parsed.frontmatter.approval_status,
    created_at: parsed.frontmatter.created_at,
    approved_at: parsed.frontmatter.approved_at,
    approved_by: parsed.frontmatter.approved_by,
    completed_at: parsed.frontmatter.completed_at,
    rejection_reason: parsed.frontmatter.rejection_reason,
  };
}

/**
 * Get parsed plan file with full details
 */
export async function getParsedPlan(
  taskId: string,
  config: VaultConfig
): Promise<ParsedPlanFile | null> {
  const filePath = await findPlanFile(taskId, config);
  if (!filePath) {
    return null;
  }

  const content = await readFile(filePath, 'utf8');
  return parsePlan(content, filePath);
}

/**
 * Get plan file path
 */
export async function getFilePath(
  taskId: string,
  config: VaultConfig
): Promise<string | null> {
  return findPlanFile(taskId, config);
}

/**
 * List all plans in a specific status
 */
export async function listByStatus(
  status: ApprovalStatus,
  config: VaultConfig
): Promise<Plan[]> {
  const { directories } = config;

  // Determine directory based on status
  let dir: string;
  switch (status) {
    case ApprovalStatus.PENDING:
      dir = directories.plans_pending;
      break;
    case ApprovalStatus.APPROVED:
      dir = directories.plans_approved;
      break;
    case ApprovalStatus.REJECTED:
      dir = directories.plans_rejected;
      break;
    default:
      dir = directories.plans;
  }

  const plans: Plan[] = [];

  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(dir, file);
        const content = await readFile(filePath, 'utf8');
        const parsed = parsePlan(content, filePath);

        plans.push({
          task_id: parsed.frontmatter.task_id,
          steps: parsed.steps,
          approval_status: parsed.frontmatter.approval_status,
          created_at: parsed.frontmatter.created_at,
          approved_at: parsed.frontmatter.approved_at,
          approved_by: parsed.frontmatter.approved_by,
          completed_at: parsed.frontmatter.completed_at,
          rejection_reason: parsed.frontmatter.rejection_reason,
        });
      }
    }
  } catch {
    // Directory may not exist
  }

  return plans;
}

/**
 * List all pending plans
 */
export async function listPending(config: VaultConfig): Promise<Plan[]> {
  return listByStatus(ApprovalStatus.PENDING, config);
}
