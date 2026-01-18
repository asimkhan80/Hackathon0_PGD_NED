import { readFile, writeFile } from 'node:fs/promises';
import matter from 'gray-matter';
import type { Task, TaskFrontmatter, StateOutcome } from '../../types/task.js';
import { TaskState, VALID_TRANSITIONS } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { StateTransitionError, TaskNotFoundError } from '../../lib/errors.js';
import { withLock } from '../../lib/filelock.js';
import { getFilePath, readFromFile } from './read.js';

/**
 * Get next valid state for a task
 */
function getNextState(currentState: TaskState, requiresApproval: boolean): TaskState | null {
  // Special case: PLAN can skip APPROVE if not required
  if (currentState === TaskState.PLAN && !requiresApproval) {
    return TaskState.ACT;
  }

  return VALID_TRANSITIONS[currentState];
}

/**
 * Validate that a state transition is allowed
 */
function validateTransition(
  taskId: string,
  currentState: TaskState,
  targetState: TaskState,
  requiresApproval: boolean
): void {
  // Check if this is the expected next state
  const expectedNext = getNextState(currentState, requiresApproval);

  if (expectedNext !== targetState) {
    throw new StateTransitionError(
      `Invalid state transition: ${currentState} -> ${targetState}. Expected: ${expectedNext}`,
      taskId,
      currentState,
      targetState
    );
  }
}

/**
 * Check if a transition is valid without throwing
 */
export function canTransition(
  currentState: TaskState,
  targetState: TaskState,
  requiresApproval: boolean
): boolean {
  const expectedNext = getNextState(currentState, requiresApproval);
  return expectedNext === targetState;
}

/**
 * Transition task to next state
 * @param id - Task UUID
 * @param outcome - Result of current state processing
 * @param config - Vault configuration
 * @returns Updated task
 * @throws StateTransitionError if transition is invalid
 * @throws TaskNotFoundError if task doesn't exist
 */
export async function transition(
  id: string,
  outcome: StateOutcome,
  config: VaultConfig
): Promise<Task> {
  // Find task file
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  return withLock(filePath, async () => {
    // Read current task
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as TaskFrontmatter & { state?: TaskState };

    // Support both 'current_state' and 'state' field names
    const currentState = frontmatter.current_state || frontmatter.state || TaskState.WATCH;
    const targetState = getNextState(currentState, frontmatter.requires_approval);

    if (!targetState) {
      throw new StateTransitionError(
        `No valid transition from state: ${currentState}`,
        id,
        currentState,
        currentState // No target
      );
    }

    // Validate transition
    validateTransition(id, currentState, targetState, frontmatter.requires_approval);

    // Handle errors
    if (!outcome.success && outcome.error) {
      frontmatter.error_count = (frontmatter.error_count || 0) + 1;
      frontmatter.last_error = outcome.error;
    }

    // Update state
    frontmatter.current_state = targetState;

    // Add outcome data to frontmatter if provided
    if (outcome.data) {
      if (outcome.data.plan_path) {
        frontmatter.plan_path = outcome.data.plan_path as string;
      }
    }

    // Write updated file
    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    // Return updated task
    return readFromFile(filePath);
  });
}

/**
 * Force transition to a specific state (for error recovery)
 * WARNING: This bypasses state validation
 * @param id - Task UUID
 * @param targetState - Target state
 * @param config - Vault configuration
 * @returns Updated task
 */
export async function forceTransition(
  id: string,
  targetState: TaskState,
  config: VaultConfig
): Promise<Task> {
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  return withLock(filePath, async () => {
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = data as TaskFrontmatter;

    frontmatter.current_state = targetState;

    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    return readFromFile(filePath);
  });
}

/**
 * Update task frontmatter without changing state
 * @param id - Task UUID
 * @param updates - Frontmatter updates
 * @param config - Vault configuration
 * @returns Updated task
 */
export async function updateTask(
  id: string,
  updates: Partial<TaskFrontmatter>,
  config: VaultConfig
): Promise<Task> {
  const filePath = await getFilePath(id, config);
  if (!filePath) {
    throw new TaskNotFoundError(id);
  }

  return withLock(filePath, async () => {
    const content = await readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    const frontmatter = { ...data, ...updates } as TaskFrontmatter;

    const updatedContent = matter.stringify(body, frontmatter);
    await writeFile(filePath, updatedContent, 'utf8');

    return readFromFile(filePath);
  });
}
