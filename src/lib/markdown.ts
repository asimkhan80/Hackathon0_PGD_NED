import matter from 'gray-matter';
import { MarkdownParseError } from './errors.js';

/**
 * Result of parsing a markdown file with YAML frontmatter
 */
export interface ParsedMarkdown<T = Record<string, unknown>> {
  frontmatter: T;
  content: string;
  raw: string;
}

/**
 * Checkbox item parsed from markdown
 */
export interface CheckboxItem {
  index: number;
  lineNumber: number;
  checked: boolean;
  text: string;
  raw: string;
}

/**
 * Parse YAML frontmatter from markdown content
 * @param content - Raw markdown string with YAML frontmatter
 * @returns Parsed frontmatter and content
 * @throws MarkdownParseError if parsing fails
 */
export function parseFrontmatter<T = Record<string, unknown>>(
  content: string
): ParsedMarkdown<T> {
  try {
    const { data, content: body } = matter(content);
    return {
      frontmatter: data as T,
      content: body.trim(),
      raw: content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    throw new MarkdownParseError(`Failed to parse frontmatter: ${message}`);
  }
}

/**
 * Update frontmatter in a markdown file
 * @param content - Raw markdown string with YAML frontmatter
 * @param updates - Key-value pairs to update in frontmatter
 * @returns Updated markdown string
 */
export function updateFrontmatter<T = Record<string, unknown>>(
  content: string,
  updates: Partial<T>
): string {
  const { frontmatter, content: body } = parseFrontmatter<T>(content);
  const updatedFrontmatter = { ...frontmatter, ...updates };
  return matter.stringify(body, updatedFrontmatter);
}

/**
 * Parse checkbox items from markdown content
 * @param content - Markdown content (without frontmatter)
 * @returns Array of checkbox items with their state and text
 */
export function parseCheckboxes(content: string): CheckboxItem[] {
  const items: CheckboxItem[] = [];
  const lines = content.split('\n');
  let checkboxIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/.exec(line);

    if (match) {
      items.push({
        index: checkboxIndex,
        lineNumber: i + 1,
        checked: match[2].toLowerCase() === 'x',
        text: match[4].trim(),
        raw: line,
      });
      checkboxIndex++;
    }
  }

  return items;
}

/**
 * Update a specific checkbox in markdown content
 * @param content - Markdown content
 * @param index - Zero-based index of checkbox to update
 * @param checked - New checked state
 * @returns Updated markdown content
 * @throws MarkdownParseError if checkbox index is out of range
 */
export function updateCheckbox(
  content: string,
  index: number,
  checked: boolean
): string {
  const checkboxes = parseCheckboxes(content);

  if (index < 0 || index >= checkboxes.length) {
    throw new MarkdownParseError(
      `Checkbox index ${index} out of range (0-${checkboxes.length - 1})`
    );
  }

  const checkbox = checkboxes[index];
  const lines = content.split('\n');
  const lineIndex = checkbox.lineNumber - 1;
  const line = lines[lineIndex];

  // Replace the checkbox marker
  const newLine = line.replace(
    /^(\s*-\s*\[)([ xX])(\].*)$/,
    `$1${checked ? 'x' : ' '}$3`
  );

  lines[lineIndex] = newLine;
  return lines.join('\n');
}

/**
 * Count completed and total checkboxes
 * @param content - Markdown content
 * @returns Object with completed and total counts
 */
export function countCheckboxes(content: string): { completed: number; total: number } {
  const checkboxes = parseCheckboxes(content);
  const completed = checkboxes.filter((cb) => cb.checked).length;
  return { completed, total: checkboxes.length };
}

/**
 * Extract numbered step from checkbox text
 * Matches patterns like: "1. Do something" or "1) Do something"
 * @param text - Checkbox text
 * @returns Step number or null if not numbered
 */
export function extractStepNumber(text: string): number | null {
  const match = /^(\d+)[.)]\s*/.exec(text);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generate markdown table row from values
 * @param values - Array of cell values
 * @returns Formatted table row string
 */
export function tableRow(values: string[]): string {
  return `| ${values.join(' | ')} |`;
}

/**
 * Generate markdown table header separator
 * @param columnCount - Number of columns
 * @returns Header separator string
 */
export function tableSeparator(columnCount: number): string {
  return `|${Array(columnCount).fill('---').join('|')}|`;
}
