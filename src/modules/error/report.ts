import { v4 as uuidv4 } from 'uuid';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type {
  ErrorReport,
  ErrorReportInput,
  ErrorReportFrontmatter,
  ErrorType,
} from '../../types/error.js';
import { Severity, ResolutionStatus } from '../../types/enums.js';
import type { VaultConfig } from '../../types/config.js';
import { withLock } from '../../lib/filelock.js';

/**
 * Generate error report filename
 */
function generateFilename(timestamp: string, taskId?: string): string {
  const dateStr = timestamp.split('T')[0].replace(/-/g, '');
  const timeStr = timestamp.split('T')[1]?.split('.')[0]?.replace(/:/g, '') || '';
  const taskPart = taskId ? `_${taskId.slice(0, 8)}` : '';
  return `ERROR_${dateStr}_${timeStr}${taskPart}.md`;
}

/**
 * Build error report markdown content
 */
function buildErrorContent(report: ErrorReport): string {
  const lines: string[] = [];

  lines.push(`# Error: ${report.error_type}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(report.context);
  lines.push('');
  lines.push('## Technical Details');
  lines.push('');
  lines.push('```');
  lines.push(report.details);
  lines.push('```');
  lines.push('');
  lines.push('## Suggested Options');
  lines.push('');
  report.suggested_options.forEach((option, i) => {
    lines.push(`${i + 1}. ${option}`);
  });
  lines.push('');
  lines.push('## Resolution');
  lines.push('');
  lines.push('[To be filled by human operator]');
  lines.push('');

  return lines.join('\n');
}

/**
 * Create error report in /Needs_Action
 * @param input - Error details
 * @param config - Vault configuration
 * @returns Created report
 */
export async function create(
  input: ErrorReportInput,
  config: VaultConfig
): Promise<ErrorReport> {
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  // Ensure at least 2 suggested options
  const suggestedOptions =
    input.suggested_options.length >= 2
      ? input.suggested_options
      : [...input.suggested_options, 'Contact system administrator'];

  const report: ErrorReport = {
    id,
    timestamp,
    task_id: input.task_id,
    error_type: input.error_type,
    severity: input.severity,
    details: input.details,
    context: input.context,
    suggested_options: suggestedOptions,
    resolution_status: ResolutionStatus.OPEN,
  };

  // Build frontmatter
  const frontmatter: ErrorReportFrontmatter = {
    id: report.id,
    timestamp: report.timestamp,
    task_id: report.task_id,
    error_type: report.error_type,
    severity: report.severity,
    resolution_status: report.resolution_status,
  };

  // Build content
  const content = buildErrorContent(report);
  const fileContent = matter.stringify(content, frontmatter);

  // Write file
  const filename = generateFilename(timestamp, input.task_id);
  const filePath = join(config.directories.needs_action, filename);

  await withLock(filePath, async () => {
    await writeFile(filePath, fileContent, 'utf8');
  });

  return report;
}

/**
 * Parse error report from file content
 */
function parseErrorReport(content: string, _filePath: string): ErrorReport {
  const { data, content: body } = matter(content);
  const frontmatter = data as ErrorReportFrontmatter;

  // Extract sections from body
  const contextMatch = /## Context\s*\n\n([\s\S]*?)(?=\n## |$)/.exec(body);
  const detailsMatch = /## Technical Details\s*\n\n```\s*\n([\s\S]*?)\n```/.exec(
    body
  );
  const optionsMatch = /## Suggested Options\s*\n\n([\s\S]*?)(?=\n## |$)/.exec(
    body
  );
  const resolutionMatch = /## Resolution\s*\n\n([\s\S]*?)$/.exec(body);

  // Parse options
  const options: string[] = [];
  if (optionsMatch) {
    const lines = optionsMatch[1].trim().split('\n');
    for (const line of lines) {
      const match = /^\d+\.\s*(.+)$/.exec(line.trim());
      if (match) {
        options.push(match[1]);
      }
    }
  }

  return {
    id: frontmatter.id,
    timestamp: frontmatter.timestamp,
    task_id: frontmatter.task_id,
    error_type: frontmatter.error_type,
    severity: frontmatter.severity,
    details: detailsMatch ? detailsMatch[1].trim() : '',
    context: contextMatch ? contextMatch[1].trim() : '',
    suggested_options: options,
    resolution_status: frontmatter.resolution_status,
    resolved_at: frontmatter.resolved_at,
    resolution_notes: resolutionMatch
      ? resolutionMatch[1].trim().replace('[To be filled by human operator]', '').trim()
      : undefined,
  };
}

/**
 * List open error reports
 * @param config - Vault configuration
 * @returns Unresolved error reports
 */
export async function listOpen(config: VaultConfig): Promise<ErrorReport[]> {
  const errors: ErrorReport[] = [];

  try {
    const files = await readdir(config.directories.needs_action);
    const errorFiles = files.filter((f) => f.startsWith('ERROR_') && f.endsWith('.md'));

    for (const file of errorFiles) {
      const filePath = join(config.directories.needs_action, file);
      const content = await readFile(filePath, 'utf8');
      const report = parseErrorReport(content, filePath);

      if (report.resolution_status === ResolutionStatus.OPEN) {
        errors.push(report);
      }
    }
  } catch {
    // Directory may not exist
  }

  // Sort by severity (critical first) then timestamp
  errors.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aSeverity = severityOrder[a.severity] ?? 4;
    const bSeverity = severityOrder[b.severity] ?? 4;

    if (aSeverity !== bSeverity) {
      return aSeverity - bSeverity;
    }

    return b.timestamp.localeCompare(a.timestamp);
  });

  return errors;
}

/**
 * Get error by ID
 * @param id - Error UUID
 * @param config - Vault configuration
 * @returns Error report or null
 */
export async function getById(
  id: string,
  config: VaultConfig
): Promise<ErrorReport | null> {
  try {
    const files = await readdir(config.directories.needs_action);
    const errorFiles = files.filter((f) => f.startsWith('ERROR_') && f.endsWith('.md'));

    for (const file of errorFiles) {
      const filePath = join(config.directories.needs_action, file);
      const content = await readFile(filePath, 'utf8');
      const report = parseErrorReport(content, filePath);

      if (report.id === id) {
        return report;
      }
    }
  } catch {
    // Directory may not exist
  }

  return null;
}

/**
 * Mark error as resolved
 * @param id - Error UUID
 * @param notes - Resolution notes
 * @param config - Vault configuration
 */
export async function resolve(
  id: string,
  notes: string,
  config: VaultConfig
): Promise<ErrorReport | null> {
  try {
    const files = await readdir(config.directories.needs_action);
    const errorFiles = files.filter((f) => f.startsWith('ERROR_') && f.endsWith('.md'));

    for (const file of errorFiles) {
      const filePath = join(config.directories.needs_action, file);
      const content = await readFile(filePath, 'utf8');
      const { data, content: body } = matter(content);

      if (data.id === id) {
        // Update frontmatter
        const frontmatter = data as ErrorReportFrontmatter;
        frontmatter.resolution_status = ResolutionStatus.RESOLVED;
        frontmatter.resolved_at = new Date().toISOString();

        // Update resolution section in body
        const updatedBody = body.replace(
          /## Resolution\s*\n\n[\s\S]*$/,
          `## Resolution\n\n${notes}\n`
        );

        const updatedContent = matter.stringify(updatedBody, frontmatter);
        await writeFile(filePath, updatedContent, 'utf8');

        return parseErrorReport(updatedContent, filePath);
      }
    }
  } catch {
    // Directory may not exist
  }

  return null;
}

/**
 * Create error from exception
 */
export async function createFromException(
  error: Error,
  context: string,
  config: VaultConfig,
  taskId?: string
): Promise<ErrorReport> {
  // Determine error type
  let errorType: ErrorType = 'TaskProcessingError';
  if (error.name === 'StateTransitionError') {
    errorType = 'StateTransitionError';
  } else if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
    errorType = 'FileSystemError';
  } else if (error.message.includes('MCP') || error.message.includes('timeout')) {
    errorType = 'MCPError';
  }

  // Determine severity
  let severity = Severity.MEDIUM;
  if (errorType === 'StateTransitionError') {
    severity = Severity.HIGH;
  } else if (errorType === 'MCPError') {
    severity = Severity.HIGH;
  }

  return create(
    {
      task_id: taskId,
      error_type: errorType,
      severity,
      details: `${error.name}: ${error.message}\n${error.stack || ''}`,
      context,
      suggested_options: [
        'Review the error details and fix manually',
        'Retry the operation',
        'Mark the task as failed',
        'Contact system administrator',
      ],
    },
    config
  );
}
