# Cognitive Loop Core API Contracts

**Feature**: 001-cognitive-loop-core
**Date**: 2026-01-17
**Type**: Internal TypeScript Module API

## Overview

This document defines the internal API contracts for the Cognitive Loop Core module.
Since this is a local-first file-based system (not a web service), contracts are defined
as TypeScript interfaces and function signatures rather than REST/GraphQL endpoints.

---

## Core Types

### Enums

```typescript
// Task source (which watcher created the task)
enum TaskSource {
  GMAIL = 'gmail',
  WHATSAPP = 'whatsapp',
  FILESYSTEM = 'filesystem',
  FINANCE = 'finance',
  MANUAL = 'manual'
}

// Cognitive loop states (must follow sequence)
enum TaskState {
  WATCH = 'WATCH',
  WRITE = 'WRITE',
  REASON = 'REASON',
  PLAN = 'PLAN',
  APPROVE = 'APPROVE',
  ACT = 'ACT',
  LOG = 'LOG',
  CLOSE = 'CLOSE'
}

// Task priority levels
enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Plan approval status
enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required'
}

// Audit entry actors
enum Actor {
  SYSTEM = 'system',
  HUMAN = 'human',
  MCP = 'mcp'
}

// Outcome status
enum Outcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending'
}

// Error severity
enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error resolution status
enum ResolutionStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  IGNORED = 'ignored'
}
```

### Interfaces

```typescript
// Task entity
interface Task {
  id: string;                    // UUID v4
  title: string;
  source: TaskSource;
  created_at: string;            // ISO 8601
  current_state: TaskState;
  priority: Priority;
  requires_approval: boolean;
  plan_path?: string;            // Relative path to Plan.md
  error_count?: number;
  last_error?: string;
  raw_content: string;           // Original markdown body
}

// Plan step
interface PlanStep {
  step_id: number;
  description: string;
  completed: boolean;
  completed_at?: string;         // ISO 8601
  outcome?: string;
}

// Plan entity
interface Plan {
  task_id: string;
  steps: PlanStep[];
  approval_status: ApprovalStatus;
  created_at: string;            // ISO 8601
  approved_at?: string;
  approved_by?: string;
  completed_at?: string;
  rejection_reason?: string;
}

// Audit entry
interface AuditEntry {
  timestamp: string;             // ISO 8601
  task_id: string;
  state_from?: TaskState;
  state_to: TaskState | string;  // string for event types
  actor: Actor;
  outcome: Outcome;
  details?: string;
  checksum: string;              // SHA-256
}

// Error report
interface ErrorReport {
  id: string;                    // UUID v4
  timestamp: string;             // ISO 8601
  task_id?: string;
  error_type: string;
  severity: Severity;
  details: string;
  context: string;
  suggested_options: string[];
  resolution_status: ResolutionStatus;
  resolved_at?: string;
  resolution_notes?: string;
}

// Vault configuration
interface VaultConfig {
  root_path: string;
  directories: {
    needs_action: string;
    plans: string;
    plans_pending: string;
    plans_approved: string;
    plans_rejected: string;
    accounting: string;
    done: string;
    done_invalid: string;
    done_failed: string;
    logs: string;
  };
}
```

---

## Module Contracts

### 1. Vault Module

**Purpose**: Initialize and manage vault directory structure

```typescript
interface VaultModule {
  /**
   * Initialize vault structure (idempotent)
   * @param config - Vault configuration with paths
   * @returns Promise resolving when all directories exist
   * @throws VaultInitError if directory creation fails
   */
  initialize(config: VaultConfig): Promise<void>;

  /**
   * Verify vault integrity
   * @param config - Vault configuration
   * @returns List of anomalies (empty if healthy)
   */
  verifyIntegrity(config: VaultConfig): Promise<VaultAnomaly[]>;

  /**
   * Get vault status
   * @returns Current vault health and statistics
   */
  getStatus(): Promise<VaultStatus>;
}

interface VaultAnomaly {
  type: 'missing_dir' | 'permission_error' | 'invalid_file';
  path: string;
  details: string;
}

interface VaultStatus {
  healthy: boolean;
  task_count: number;
  pending_approvals: number;
  errors_open: number;
  last_activity: string;
}
```

### 2. Task Module

**Purpose**: Create, read, update tasks and manage state transitions

```typescript
interface TaskModule {
  /**
   * Create a new task from incoming content
   * @param content - Raw markdown content
   * @param source - Which watcher created this task
   * @returns Created task with ID
   */
  create(content: string, source: TaskSource): Promise<Task>;

  /**
   * Get task by ID
   * @param id - Task UUID
   * @returns Task or null if not found
   */
  getById(id: string): Promise<Task | null>;

  /**
   * List tasks in a given state
   * @param state - Filter by state
   * @returns Array of tasks
   */
  listByState(state: TaskState): Promise<Task[]>;

  /**
   * Transition task to next state
   * @param id - Task UUID
   * @param outcome - Result of current state processing
   * @returns Updated task
   * @throws StateTransitionError if transition is invalid
   */
  transition(id: string, outcome: StateOutcome): Promise<Task>;

  /**
   * Check if task requires approval based on Article IV
   * @param task - Task to evaluate
   * @returns true if approval required
   */
  requiresApproval(task: Task): boolean;

  /**
   * Move task to /Done
   * @param id - Task UUID
   * @param status - Final status (completed, failed, invalid)
   */
  complete(id: string, status: CompletionStatus): Promise<void>;
}

interface StateOutcome {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

type CompletionStatus = 'completed' | 'failed' | 'invalid' | 'rejected';
```

### 3. Plan Module

**Purpose**: Generate and manage execution plans

```typescript
interface PlanModule {
  /**
   * Generate plan for a task
   * @param task - Task to plan for
   * @param steps - List of step descriptions
   * @returns Created plan
   */
  create(task: Task, steps: string[]): Promise<Plan>;

  /**
   * Get plan for a task
   * @param taskId - Task UUID
   * @returns Plan or null
   */
  getByTaskId(taskId: string): Promise<Plan | null>;

  /**
   * Mark a step as completed
   * @param taskId - Task UUID
   * @param stepId - Step number
   * @param outcome - Result description
   */
  completeStep(taskId: string, stepId: number, outcome: string): Promise<void>;

  /**
   * Check if all steps are complete
   * @param taskId - Task UUID
   * @returns true if all checkboxes marked
   */
  isComplete(taskId: string): Promise<boolean>;

  /**
   * Move plan to approval folder
   * @param taskId - Task UUID
   */
  submitForApproval(taskId: string): Promise<void>;

  /**
   * Check approval status by detecting file location
   * @param taskId - Task UUID
   * @returns Current approval status
   */
  checkApprovalStatus(taskId: string): Promise<ApprovalStatus>;
}
```

### 4. Audit Module

**Purpose**: Immutable audit logging

```typescript
interface AuditModule {
  /**
   * Append audit entry (cannot modify past entries)
   * @param entry - Entry to log (checksum auto-generated)
   */
  log(entry: Omit<AuditEntry, 'checksum'>): Promise<void>;

  /**
   * Get all entries for a task
   * @param taskId - Task UUID
   * @returns Chronological list of entries
   */
  getByTaskId(taskId: string): Promise<AuditEntry[]>;

  /**
   * Get entries for a date
   * @param date - ISO date string (YYYY-MM-DD)
   * @returns All entries for that day
   */
  getByDate(date: string): Promise<AuditEntry[]>;

  /**
   * Verify log integrity
   * @param date - ISO date string
   * @returns true if all checksums valid
   */
  verifyIntegrity(date: string): Promise<boolean>;
}
```

### 5. Error Module

**Purpose**: Error escalation and management

```typescript
interface ErrorModule {
  /**
   * Create error report in /Needs_Action
   * @param error - Error details
   * @returns Created report
   */
  create(error: Omit<ErrorReport, 'id' | 'timestamp' | 'resolution_status'>): Promise<ErrorReport>;

  /**
   * List open errors
   * @returns Unresolved error reports
   */
  listOpen(): Promise<ErrorReport[]>;

  /**
   * Mark error as resolved
   * @param id - Error UUID
   * @param notes - Resolution notes
   */
  resolve(id: string, notes: string): Promise<void>;

  /**
   * Get error by ID
   * @param id - Error UUID
   * @returns Error report or null
   */
  getById(id: string): Promise<ErrorReport | null>;
}
```

### 6. Cognitive Loop Module

**Purpose**: Main orchestrator for the cognitive loop

```typescript
interface CognitiveLoopModule {
  /**
   * Start the cognitive loop (begins watching)
   * @param config - Vault configuration
   */
  start(config: VaultConfig): Promise<void>;

  /**
   * Stop the cognitive loop gracefully
   * @param timeout - Max wait time for in-flight tasks
   */
  stop(timeout?: number): Promise<void>;

  /**
   * Process a single task through all states
   * @param taskId - Task UUID
   * @returns Final task state
   */
  processTask(taskId: string): Promise<Task>;

  /**
   * Get loop status
   * @returns Current processing state
   */
  getStatus(): CognitiveLoopStatus;

  /**
   * Subscribe to state change events
   * @param callback - Handler for state changes
   */
  onStateChange(callback: StateChangeHandler): void;
}

interface CognitiveLoopStatus {
  running: boolean;
  tasks_in_progress: number;
  tasks_waiting_approval: number;
  last_processed: string;
  uptime_seconds: number;
}

type StateChangeHandler = (taskId: string, from: TaskState, to: TaskState) => void;
```

---

## Error Types

```typescript
class VaultInitError extends Error {
  constructor(message: string, public path: string) {
    super(message);
    this.name = 'VaultInitError';
  }
}

class StateTransitionError extends Error {
  constructor(
    message: string,
    public taskId: string,
    public currentState: TaskState,
    public attemptedState: TaskState
  ) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

class TaskNotFoundError extends Error {
  constructor(public taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

class PlanValidationError extends Error {
  constructor(message: string, public taskId: string) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

class AuditIntegrityError extends Error {
  constructor(message: string, public date: string, public entryIndex: number) {
    super(message);
    this.name = 'AuditIntegrityError';
  }
}
```

---

## Event Types

```typescript
// Events emitted by cognitive loop
type CognitiveLoopEvent =
  | { type: 'task_created'; task: Task }
  | { type: 'state_changed'; taskId: string; from: TaskState; to: TaskState }
  | { type: 'approval_required'; taskId: string; planPath: string }
  | { type: 'approval_received'; taskId: string; approved: boolean }
  | { type: 'task_completed'; taskId: string; status: CompletionStatus }
  | { type: 'error_occurred'; error: ErrorReport }
  | { type: 'loop_started' }
  | { type: 'loop_stopped'; graceful: boolean };
```
