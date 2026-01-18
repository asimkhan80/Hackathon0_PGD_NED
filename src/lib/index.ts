// Error classes
export {
  VaultInitError,
  StateTransitionError,
  TaskNotFoundError,
  PlanValidationError,
  AuditIntegrityError,
  FileLockError,
  MarkdownParseError,
  ConfigError,
} from './errors.js';

// Markdown utilities
export {
  parseFrontmatter,
  updateFrontmatter,
  parseCheckboxes,
  updateCheckbox,
  countCheckboxes,
  extractStepNumber,
  tableRow,
  tableSeparator,
} from './markdown.js';
export type { ParsedMarkdown, CheckboxItem } from './markdown.js';

// File locking utilities
export {
  acquireLock,
  releaseLock,
  isLocked,
  withLock,
  withLocks,
} from './filelock.js';
export type { LockOptions, ReleaseFn } from './filelock.js';

// Checksum utilities
export {
  sha256,
  sha256Buffer,
  sha256File,
  verifyChecksum,
  verifyFileChecksum,
  checksumEntry,
  verifyEntryChecksum,
  shortChecksum,
} from './checksum.js';
