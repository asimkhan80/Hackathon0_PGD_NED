import { TaskState } from '../types/enums.js';

/**
 * Error thrown when vault initialization fails
 */
export class VaultInitError extends Error {
  public readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = 'VaultInitError';
    this.path = path;
    Object.setPrototypeOf(this, VaultInitError.prototype);
  }
}

/**
 * Error thrown when an invalid state transition is attempted
 */
export class StateTransitionError extends Error {
  public readonly taskId: string;
  public readonly currentState: TaskState;
  public readonly attemptedState: TaskState;

  constructor(
    message: string,
    taskId: string,
    currentState: TaskState,
    attemptedState: TaskState
  ) {
    super(message);
    this.name = 'StateTransitionError';
    this.taskId = taskId;
    this.currentState = currentState;
    this.attemptedState = attemptedState;
    Object.setPrototypeOf(this, StateTransitionError.prototype);
  }
}

/**
 * Error thrown when a task is not found
 */
export class TaskNotFoundError extends Error {
  public readonly taskId: string;

  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
    this.taskId = taskId;
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}

/**
 * Error thrown when plan validation fails
 */
export class PlanValidationError extends Error {
  public readonly taskId: string;

  constructor(message: string, taskId: string) {
    super(message);
    this.name = 'PlanValidationError';
    this.taskId = taskId;
    Object.setPrototypeOf(this, PlanValidationError.prototype);
  }
}

/**
 * Error thrown when audit log integrity check fails
 */
export class AuditIntegrityError extends Error {
  public readonly date: string;
  public readonly entryIndex: number;

  constructor(message: string, date: string, entryIndex: number) {
    super(message);
    this.name = 'AuditIntegrityError';
    this.date = date;
    this.entryIndex = entryIndex;
    Object.setPrototypeOf(this, AuditIntegrityError.prototype);
  }
}

/**
 * Error thrown when file locking fails
 */
export class FileLockError extends Error {
  public readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message);
    this.name = 'FileLockError';
    this.filePath = filePath;
    Object.setPrototypeOf(this, FileLockError.prototype);
  }
}

/**
 * Error thrown when markdown parsing fails
 */
export class MarkdownParseError extends Error {
  public readonly filePath?: string;

  constructor(message: string, filePath?: string) {
    super(message);
    this.name = 'MarkdownParseError';
    this.filePath = filePath;
    Object.setPrototypeOf(this, MarkdownParseError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}
