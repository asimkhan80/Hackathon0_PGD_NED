import { createMachine, assign } from 'xstate';
import { TaskState } from '../../types/enums.js';
import type { Task } from '../../types/task.js';

/**
 * Context for the cognitive loop machine
 */
export interface CognitiveLoopContext {
  /** Current task being processed */
  task: Task | null;
  /** Error from last operation */
  error: string | null;
  /** Whether approval is required for current task */
  requiresApproval: boolean;
  /** Plan path if generated */
  planPath: string | null;
  /** Number of retries attempted */
  retryCount: number;
}

/**
 * Events that drive the cognitive loop
 */
export type CognitiveLoopEvent =
  | { type: 'TASK_RECEIVED'; task: Task }
  | { type: 'WRITE_COMPLETE' }
  | { type: 'REASON_COMPLETE' }
  | { type: 'PLAN_COMPLETE'; planPath: string; requiresApproval: boolean }
  | { type: 'APPROVED' }
  | { type: 'REJECTED'; reason: string }
  | { type: 'ACT_COMPLETE' }
  | { type: 'LOG_COMPLETE' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

/**
 * Initial context for the machine
 */
const initialContext: CognitiveLoopContext = {
  task: null,
  error: null,
  requiresApproval: false,
  planPath: null,
  retryCount: 0,
};

/**
 * Guard: Check if task requires approval
 */
function needsApproval(context: CognitiveLoopContext): boolean {
  return context.requiresApproval;
}


/**
 * Cognitive Loop State Machine
 *
 * Implements the 8-step cognitive loop:
 * WATCH → WRITE → REASON → PLAN → APPROVE → ACT → LOG → CLOSE
 *
 * Guards prevent step skipping (Article III compliance)
 */
export const cognitiveLoopMachine = createMachine(
  {
    id: 'cognitiveLoop',
    initial: 'idle',
    context: initialContext,
    states: {
      /**
       * Idle state - waiting for a task
       */
      idle: {
        on: {
          TASK_RECEIVED: {
            target: 'watch',
            actions: assign({
              task: ({ event }) => event.task,
              error: null,
              requiresApproval: false,
              planPath: null,
              retryCount: 0,
            }),
          },
        },
      },

      /**
       * WATCH - Task detected, ready for processing
       */
      watch: {
        on: {
          WRITE_COMPLETE: {
            target: 'write',
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },

      /**
       * WRITE - Creating interpretation record
       */
      write: {
        on: {
          REASON_COMPLETE: {
            target: 'reason',
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },

      /**
       * REASON - Analyzing intent and requirements
       */
      reason: {
        on: {
          PLAN_COMPLETE: {
            target: 'plan',
            actions: assign({
              planPath: ({ event }) => event.planPath,
              requiresApproval: ({ event }) => event.requiresApproval,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },

      /**
       * PLAN - Plan generated, deciding approval path
       */
      plan: {
        always: [
          {
            target: 'approve',
            guard: 'needsApproval',
          },
          {
            target: 'act',
          },
        ],
      },

      /**
       * APPROVE - Awaiting human approval
       */
      approve: {
        on: {
          APPROVED: {
            target: 'act',
          },
          REJECTED: {
            target: 'close',
            actions: assign({
              error: ({ event }) => `Plan rejected: ${event.reason}`,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },

      /**
       * ACT - Executing planned actions
       */
      act: {
        on: {
          ACT_COMPLETE: {
            target: 'log',
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },

      /**
       * LOG - Writing audit entry
       */
      log: {
        on: {
          LOG_COMPLETE: {
            target: 'close',
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },

      /**
       * CLOSE - Terminal state, task complete
       */
      close: {
        type: 'final',
      },

      /**
       * ERROR - Error occurred, escalation needed
       */
      error: {
        on: {
          RESET: {
            target: 'idle',
            actions: assign(initialContext),
          },
        },
      },
    },
  },
  {
    guards: {
      needsApproval: ({ context }) => needsApproval(context),
    },
  }
);

/**
 * Map XState state to TaskState enum
 */
export function mapToTaskState(stateValue: string): TaskState | null {
  const mapping: Record<string, TaskState> = {
    watch: TaskState.WATCH,
    write: TaskState.WRITE,
    reason: TaskState.REASON,
    plan: TaskState.PLAN,
    approve: TaskState.APPROVE,
    act: TaskState.ACT,
    log: TaskState.LOG,
    close: TaskState.CLOSE,
  };

  return mapping[stateValue] ?? null;
}

/**
 * Map TaskState enum to XState state name
 */
export function mapFromTaskState(taskState: TaskState): string {
  return taskState.toLowerCase();
}

/**
 * Type for machine state
 */
export type CognitiveLoopState = typeof cognitiveLoopMachine.config.states;
