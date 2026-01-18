import { TaskSource, TaskState, Priority } from './enums.js';

/**
 * Task entity - represents work item flowing through the cognitive loop
 * Storage: Individual markdown files in vault directories
 */
export interface Task {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Human-readable task title */
  title: string;

  /** Origin watcher: gmail, whatsapp, filesystem, finance, manual */
  source: TaskSource;

  /** Timestamp when task entered /Needs_Action (ISO 8601) */
  created_at: string;

  /** Current state in cognitive loop */
  current_state: TaskState;

  /** Task priority level (default: normal) */
  priority: Priority;

  /** Whether task matches Article IV criteria requiring approval */
  requires_approval: boolean;

  /** Relative path to Plan.md file (set when state >= PLAN) */
  plan_path?: string;

  /** Number of times task encountered errors */
  error_count?: number;

  /** Most recent error message */
  last_error?: string;

  /** Original markdown body content */
  raw_content: string;
}

/**
 * Task frontmatter - YAML header in task markdown files
 */
export interface TaskFrontmatter {
  id: string;
  title: string;
  source: TaskSource;
  created_at: string;
  current_state: TaskState;
  priority: Priority;
  requires_approval: boolean;
  plan_path?: string;
  error_count?: number;
  last_error?: string;
}

/**
 * State transition outcome
 */
export interface StateOutcome {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Task file parsed result
 */
export interface ParsedTaskFile {
  frontmatter: TaskFrontmatter;
  content: string;
  filePath: string;
}
