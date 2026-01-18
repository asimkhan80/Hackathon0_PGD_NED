/**
 * Task source - which watcher created the task
 */
export enum TaskSource {
  GMAIL = 'gmail',
  WHATSAPP = 'whatsapp',
  FILESYSTEM = 'filesystem',
  FINANCE = 'finance',
  MANUAL = 'manual',
}

/**
 * Cognitive loop states - must follow sequence
 * WATCH → WRITE → REASON → PLAN → APPROVE → ACT → LOG → CLOSE
 */
export enum TaskState {
  WATCH = 'WATCH',
  WRITE = 'WRITE',
  REASON = 'REASON',
  PLAN = 'PLAN',
  APPROVE = 'APPROVE',
  ACT = 'ACT',
  LOG = 'LOG',
  CLOSE = 'CLOSE',
}

/**
 * Task priority levels
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Plan approval status
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required',
}

/**
 * Audit entry actors
 */
export enum Actor {
  SYSTEM = 'system',
  HUMAN = 'human',
  MCP = 'mcp',
}

/**
 * Outcome status
 */
export enum Outcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}

/**
 * Error severity
 */
export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error resolution status
 */
export enum ResolutionStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
}

/**
 * Task completion status
 */
export type CompletionStatus = 'completed' | 'failed' | 'invalid' | 'rejected';

/**
 * Valid state transitions - enforces cognitive loop sequence
 */
export const VALID_TRANSITIONS: Record<TaskState, TaskState | null> = {
  [TaskState.WATCH]: TaskState.WRITE,
  [TaskState.WRITE]: TaskState.REASON,
  [TaskState.REASON]: TaskState.PLAN,
  [TaskState.PLAN]: TaskState.APPROVE, // or ACT if no approval needed
  [TaskState.APPROVE]: TaskState.ACT,
  [TaskState.ACT]: TaskState.LOG,
  [TaskState.LOG]: TaskState.CLOSE,
  [TaskState.CLOSE]: null, // terminal state
};

/**
 * States ordered for sequence validation
 */
export const STATE_ORDER: TaskState[] = [
  TaskState.WATCH,
  TaskState.WRITE,
  TaskState.REASON,
  TaskState.PLAN,
  TaskState.APPROVE,
  TaskState.ACT,
  TaskState.LOG,
  TaskState.CLOSE,
];
