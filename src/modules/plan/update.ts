import { readFile, writeFile } from 'node:fs/promises';
import matter from 'gray-matter';
import type { Plan, PlanFrontmatter } from '../../types/plan.js';
import type { VaultConfig } from '../../types/config.js';
import { PlanValidationError } from '../../lib/errors.js';
import { withLock } from '../../lib/filelock.js';
import { updateCheckbox, countCheckboxes } from '../../lib/markdown.js';
import { getFilePath, getByTaskId } from './read.js';

/**
 * Mark a step as completed
 * @param taskId - Task UUID
 * @param stepId - Step number (1-indexed)
 * @param outcome - Result description
 * @param config - Vault configuration
 * @returns Updated plan
 */
export async function completeStep(
  taskId: string,
  stepId: number,
  outcome: string,
  config: VaultConfig
): Promise<Plan> {
  const filePath = await getFilePath(taskId, config);
  if (!filePath) {
    throw new PlanValidationError(`Plan not found for task: ${taskId}`, taskId);
  }

  return withLock(filePath, async () => {
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as PlanFrontmatter;

    // Find the checkbox index (stepId is 1-indexed, checkbox index is 0-indexed)
    const checkboxIndex = stepId - 1;

    // Update the checkbox
    let updatedBody: string;
    try {
      updatedBody = updateCheckbox(body, checkboxIndex, true);
    } catch (error) {
      throw new PlanValidationError(
        `Step ${stepId} not found in plan`,
        taskId
      );
    }

    // Add outcome as comment after the checkbox line if provided
    if (outcome) {
      const lines = updatedBody.split('\n');
      let checkboxCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*-\s*\[/.test(lines[i])) {
          if (checkboxCount === checkboxIndex) {
            // Add outcome after this line
            lines.splice(i + 1, 0, `  - Completed: ${outcome} (${new Date().toISOString()})`);
            break;
          }
          checkboxCount++;
        }
      }
      updatedBody = lines.join('\n');
    }

    // Check if all steps are complete
    const { completed, total } = countCheckboxes(updatedBody);
    if (completed === total) {
      frontmatter.completed_at = new Date().toISOString();
    }

    // Write updated file
    const updatedContent = matter.stringify(updatedBody, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    // Return updated plan
    const plan = await getByTaskId(taskId, config);
    if (!plan) {
      throw new PlanValidationError(`Failed to read updated plan`, taskId);
    }
    return plan;
  });
}

/**
 * Mark a step as incomplete (uncheck)
 */
export async function uncompleteStep(
  taskId: string,
  stepId: number,
  config: VaultConfig
): Promise<Plan> {
  const filePath = await getFilePath(taskId, config);
  if (!filePath) {
    throw new PlanValidationError(`Plan not found for task: ${taskId}`, taskId);
  }

  return withLock(filePath, async () => {
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as PlanFrontmatter;

    const checkboxIndex = stepId - 1;
    const updatedBody = updateCheckbox(body, checkboxIndex, false);

    // Clear completed_at since not all steps are done
    delete (frontmatter as unknown as Record<string, unknown>).completed_at;

    const updatedContent = matter.stringify(updatedBody, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    const plan = await getByTaskId(taskId, config);
    if (!plan) {
      throw new PlanValidationError(`Failed to read updated plan`, taskId);
    }
    return plan;
  });
}

/**
 * Update plan frontmatter
 */
export async function updatePlanMeta(
  taskId: string,
  updates: Partial<PlanFrontmatter>,
  config: VaultConfig
): Promise<Plan> {
  const filePath = await getFilePath(taskId, config);
  if (!filePath) {
    throw new PlanValidationError(`Plan not found for task: ${taskId}`, taskId);
  }

  return withLock(filePath, async () => {
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = { ...data, ...updates } as PlanFrontmatter;

    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    const plan = await getByTaskId(taskId, config);
    if (!plan) {
      throw new PlanValidationError(`Failed to read updated plan`, taskId);
    }
    return plan;
  });
}

/**
 * Complete all steps at once
 */
export async function completeAllSteps(
  taskId: string,
  config: VaultConfig
): Promise<Plan> {
  const filePath = await getFilePath(taskId, config);
  if (!filePath) {
    throw new PlanValidationError(`Plan not found for task: ${taskId}`, taskId);
  }

  return withLock(filePath, async () => {
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as PlanFrontmatter;

    // Replace all [ ] with [x]
    const updatedBody = body.replace(/\[\s\]/g, '[x]');

    frontmatter.completed_at = new Date().toISOString();

    const updatedContent = matter.stringify(updatedBody, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    const plan = await getByTaskId(taskId, config);
    if (!plan) {
      throw new PlanValidationError(`Failed to read updated plan`, taskId);
    }
    return plan;
  });
}
