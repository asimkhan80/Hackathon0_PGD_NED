// Task creation
export { create, createFromFile } from './create.js';
export type { CreateTaskOptions } from './create.js';

// Task reading
export {
  getById,
  getByIdOrThrow,
  listByState,
  listActive,
  getFilePath,
  readFromFile,
} from './read.js';

// State transitions
export {
  transition,
  forceTransition,
  updateTask,
  canTransition,
} from './transition.js';

// Approval checking
export {
  requiresApproval,
  analyzeApprovalCriteria,
  getApprovalReasons,
  getApprovalLevel,
} from './approval.js';
export type { ApprovalCriteria } from './approval.js';

// Task completion
export {
  complete,
  fail,
  invalidate,
  reject,
  archive,
  deleteTask,
  reopen,
} from './complete.js';
