// Plan generation
export {
  generate,
  generateDefaultSteps,
  getPlanPath,
  getPendingPlanPath,
} from './generate.js';
export type { GeneratePlanOptions } from './generate.js';

// Plan reading
export {
  getByTaskId,
  getParsedPlan,
  getFilePath,
  listByStatus,
  listPending,
} from './read.js';

// Plan updates
export {
  completeStep,
  uncompleteStep,
  updatePlanMeta,
  completeAllSteps,
} from './update.js';

// Plan validation
export {
  isComplete,
  getProgress,
  isReadyForExecution,
  validate,
  canExecute,
  getNextStep,
} from './validate.js';
export type { ValidationResult } from './validate.js';

// Plan approval
export {
  submitForApproval,
  checkApprovalStatus,
  markApproved,
  markRejected,
  createApprovalReminder,
  checkStalePending,
} from './approval.js';
