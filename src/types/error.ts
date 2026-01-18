import { Severity, ResolutionStatus } from './enums.js';

/**
 * Error report - escalation record for failures
 * Storage: Individual markdown files in /Needs_Action
 */
export interface ErrorReport {
  /** Unique error ID (UUID v4) */
  id: string;

  /** When error occurred (ISO 8601) */
  timestamp: string;

  /** Related task UUID (null for system errors) */
  task_id?: string;

  /** Classification of error */
  error_type: ErrorType;

  /** Error severity level */
  severity: Severity;

  /** Technical error information */
  details: string;

  /** What the system was doing */
  context: string;

  /** List of remediation options (at least 2) */
  suggested_options: string[];

  /** Current resolution status */
  resolution_status: ResolutionStatus;

  /** When error was resolved (ISO 8601) */
  resolved_at?: string;

  /** How error was resolved */
  resolution_notes?: string;
}

/**
 * Error types enumeration
 */
export type ErrorType =
  | 'TaskProcessingError'
  | 'MCPError'
  | 'ValidationError'
  | 'StateTransitionError'
  | 'FileSystemError'
  | 'AmbiguityError';

/**
 * Error report input (for creation)
 */
export type ErrorReportInput = Omit<
  ErrorReport,
  'id' | 'timestamp' | 'resolution_status'
>;

/**
 * Error report frontmatter
 */
export interface ErrorReportFrontmatter {
  id: string;
  timestamp: string;
  task_id?: string;
  error_type: ErrorType;
  severity: Severity;
  resolution_status: ResolutionStatus;
  resolved_at?: string;
}

/**
 * Parsed error report file
 */
export interface ParsedErrorFile {
  frontmatter: ErrorReportFrontmatter;
  context: string;
  details: string;
  suggested_options: string[];
  resolution_notes?: string;
  filePath: string;
}
