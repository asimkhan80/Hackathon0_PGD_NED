import { createActor, Subscription } from 'xstate';
import { cognitiveLoopMachine, mapToTaskState } from './machine.js';
import type { Task } from '../../types/task.js';
import { TaskState, ApprovalStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import * as taskModule from '../task/index.js';
import * as planModule from '../plan/index.js';

/**
 * State change handler type
 */
export type StateChangeHandler = (
  taskId: string,
  from: TaskState | null,
  to: TaskState
) => void;

/**
 * Processor result
 */
export interface ProcessorResult {
  task: Task;
  success: boolean;
  finalState: TaskState;
  error?: string;
}

/**
 * Process a single task through the cognitive loop
 * @param task - Task to process
 * @param config - Vault configuration
 * @param onStateChange - Optional callback for state changes
 * @returns Final task state
 */
export async function processTask(
  task: Task,
  config: VaultConfig,
  onStateChange?: StateChangeHandler
): Promise<ProcessorResult> {
  // Create actor from machine
  const actor = createActor(cognitiveLoopMachine);
  let lastState: TaskState | null = null;

  // Subscribe to state changes
  const subscription: Subscription = actor.subscribe((snapshot) => {
    const currentState = mapToTaskState(snapshot.value as string);
    if (currentState && currentState !== lastState) {
      onStateChange?.(task.id, lastState, currentState);
      lastState = currentState;
    }
  });

  try {
    // Start the actor
    actor.start();

    // Send initial task
    actor.send({ type: 'TASK_RECEIVED', task });

    // Process through states
    let currentTask = task;

    // WATCH -> WRITE
    await simulateStateProcessing('write');
    currentTask = await taskModule.transition(
      currentTask.id,
      { success: true },
      config
    );
    actor.send({ type: 'WRITE_COMPLETE' });

    // WRITE -> REASON
    await simulateStateProcessing('reason');
    currentTask = await taskModule.transition(
      currentTask.id,
      { success: true },
      config
    );
    actor.send({ type: 'REASON_COMPLETE' });

    // REASON -> PLAN: Generate actual plan
    const requiresApproval = taskModule.requiresApproval(currentTask);
    const steps = planModule.generateDefaultSteps(currentTask);
    await planModule.generate(
      currentTask,
      { steps, requiresApproval },
      config
    );
    const planPath = requiresApproval
      ? planModule.getPendingPlanPath(currentTask.id, config)
      : planModule.getPlanPath(currentTask.id, config);

    currentTask = await taskModule.transition(
      currentTask.id,
      { success: true, data: { plan_path: planPath } },
      config
    );
    actor.send({
      type: 'PLAN_COMPLETE',
      planPath,
      requiresApproval,
    });

    // PLAN -> APPROVE (if required) or ACT
    if (requiresApproval) {
      // Wait for approval (this would normally be async/polling)
      // For now, we'll skip to demonstrate flow
      currentTask = await taskModule.transition(
        currentTask.id,
        { success: true },
        config
      );
      actor.send({ type: 'APPROVED' });
    }

    // APPROVE/PLAN -> ACT
    await simulateStateProcessing('act');
    currentTask = await taskModule.transition(
      currentTask.id,
      { success: true },
      config
    );
    actor.send({ type: 'ACT_COMPLETE' });

    // ACT -> LOG
    await simulateStateProcessing('log');
    currentTask = await taskModule.transition(
      currentTask.id,
      { success: true },
      config
    );
    actor.send({ type: 'LOG_COMPLETE' });

    // LOG -> CLOSE
    await taskModule.complete(currentTask.id, 'completed', config);

    return {
      task: currentTask,
      success: true,
      finalState: TaskState.CLOSE,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Send error to machine
    actor.send({ type: 'ERROR', error: errorMessage });

    // Try to get current task state
    let finalTask = task;
    try {
      const current = await taskModule.getById(task.id, config);
      if (current) finalTask = current;
    } catch {
      // Ignore errors reading task
    }

    return {
      task: finalTask,
      success: false,
      finalState: finalTask.current_state,
      error: errorMessage,
    };
  } finally {
    subscription.unsubscribe();
    actor.stop();
  }
}

/**
 * Simulate state processing (placeholder for actual work)
 */
async function simulateStateProcessing(_state: string): Promise<void> {
  // In a real implementation, this would:
  // - WRITE: Create interpretation record
  // - REASON: Analyze intent
  // - PLAN: Generate plan.md
  // - ACT: Execute actions via MCP
  // - LOG: Write audit entry
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Process task with approval polling
 * @param task - Task to process
 * @param config - Vault configuration
 * @param checkApproval - Function to check approval status
 * @param pollInterval - How often to check approval (ms)
 * @param timeout - Maximum time to wait for approval (ms)
 */
export async function processTaskWithApproval(
  task: Task,
  config: VaultConfig,
  checkApproval: (taskId: string) => Promise<ApprovalStatus>,
  pollInterval = 5000,
  timeout = 86400000 // 24 hours
): Promise<ProcessorResult> {
  const startTime = Date.now();

  // Process up to APPROVE state
  let currentTask = task;

  // Transition through WATCH -> WRITE -> REASON -> PLAN
  while (currentTask.current_state !== TaskState.APPROVE) {
    if (currentTask.current_state === TaskState.CLOSE) {
      return {
        task: currentTask,
        success: true,
        finalState: TaskState.CLOSE,
      };
    }

    currentTask = await taskModule.transition(
      currentTask.id,
      { success: true },
      config
    );
  }

  // Wait for approval
  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeout) {
      return {
        task: currentTask,
        success: false,
        finalState: currentTask.current_state,
        error: 'Approval timeout exceeded',
      };
    }

    const status = await checkApproval(currentTask.id);

    if (status === ApprovalStatus.APPROVED) {
      // Continue processing
      currentTask = await taskModule.transition(
        currentTask.id,
        { success: true },
        config
      );

      // ACT -> LOG -> CLOSE
      currentTask = await taskModule.transition(
        currentTask.id,
        { success: true },
        config
      );
      currentTask = await taskModule.transition(
        currentTask.id,
        { success: true },
        config
      );
      await taskModule.complete(currentTask.id, 'completed', config);

      return {
        task: currentTask,
        success: true,
        finalState: TaskState.CLOSE,
      };
    }

    if (status === ApprovalStatus.REJECTED) {
      await taskModule.reject(currentTask.id, 'Plan rejected by user', config);
      return {
        task: currentTask,
        success: false,
        finalState: TaskState.CLOSE,
        error: 'Plan rejected',
      };
    }

    // Still pending, wait and poll again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
