import { ApprovalStatus } from './enums.js';

/**
 * Plan step - individual checkbox item in a plan
 */
export interface PlanStep {
  /** Sequential step number */
  step_id: number;

  /** What this step does */
  description: string;

  /** Checkbox state */
  completed: boolean;

  /** When step was marked done (ISO 8601) */
  completed_at?: string;

  /** Result of step execution */
  outcome?: string;
}

/**
 * Plan entity - execution plan for a task
 * Storage: Markdown files in /Plans directory
 */
export interface Plan {
  /** Reference to parent Task UUID */
  task_id: string;

  /** List of PlanStep objects */
  steps: PlanStep[];

  /** Current approval status */
  approval_status: ApprovalStatus;

  /** When plan was generated (ISO 8601) */
  created_at: string;

  /** When human approved (ISO 8601) */
  approved_at?: string;

  /** Identifier of approver */
  approved_by?: string;

  /** When all steps finished (ISO 8601) */
  completed_at?: string;

  /** Why plan was rejected */
  rejection_reason?: string;
}

/**
 * Plan frontmatter - YAML header in plan markdown files
 */
export interface PlanFrontmatter {
  task_id: string;
  approval_status: ApprovalStatus;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  completed_at?: string;
  rejection_reason?: string;
}

/**
 * Plan file parsed result
 */
export interface ParsedPlanFile {
  frontmatter: PlanFrontmatter;
  steps: PlanStep[];
  content: string;
  filePath: string;
}
