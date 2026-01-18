// Audit logging
export {
  log,
  logStateTransition,
  logSystemEvent,
  logTaskCreated,
  logTaskCompleted,
  logApproval,
} from './log.js';

// Audit queries
export {
  getByTaskId,
  getByDate,
  getAll,
  query,
  getRecent,
  countByOutcome,
} from './query.js';

// Audit verification
export {
  verifyIntegrity,
  verifyIntegrityDetailed,
  verifyAllLogs,
  logExists,
  getLogDates,
  getIntegritySummary,
} from './verify.js';
