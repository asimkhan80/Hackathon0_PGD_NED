# Feature Specification: Vault Structure and Cognitive Loop Core

**Feature Branch**: `001-cognitive-loop-core`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Build the foundational infrastructure for the Digital FTE system including vault folder structure, cognitive loop state machine, file-based state management, Plan.md templates, audit logging, file movement operations, and error escalation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize Vault Structure (Priority: P1)

As a system administrator, I want to initialize the Digital FTE vault with the required folder structure so that the cognitive loop has designated locations for each stage of task processing.

**Why this priority**: Without the folder structure, no other component can function. This is the foundational prerequisite for all Digital FTE operations.

**Independent Test**: Can be fully tested by running vault initialization and verifying all required directories exist with correct permissions. Delivers a working vault skeleton.

**Acceptance Scenarios**:

1. **Given** an empty or non-existent vault directory, **When** vault initialization runs, **Then** all required directories (/Needs_Action, /Plans, /Accounting, /Done, /Logs) are created
2. **Given** an existing vault with partial structure, **When** vault initialization runs, **Then** missing directories are created without affecting existing content
3. **Given** a fully initialized vault, **When** vault initialization runs again, **Then** operation completes idempotently with no changes

---

### User Story 2 - Process Task Through Cognitive Loop (Priority: P1)

As the Digital FTE system, I want to process incoming task files through the complete cognitive loop (WATCH-WRITE-REASON-PLAN-APPROVE-ACT-LOG-CLOSE) so that every task follows a traceable, auditable execution path with no steps skipped.

**Why this priority**: This is the core behavior that defines the Digital FTE. Without the cognitive loop, the system cannot function as specified in the constitution.

**Independent Test**: Can be fully tested by placing a task file in /Needs_Action and observing it progress through each stage with audit entries created at each step.

**Acceptance Scenarios**:

1. **Given** a new .md file appears in /Needs_Action, **When** the cognitive loop detects it, **Then** it transitions to WRITE state and creates an interpretation record
2. **Given** a task in REASON state, **When** processing completes, **Then** a Plan.md file with checkboxes is created in /Plans
3. **Given** a task requiring approval (per Article IV boundaries), **When** reaching APPROVE state, **Then** execution halts until file is moved to approved location
4. **Given** a task in ACT state, **When** action completes successfully, **Then** LOG state creates an immutable audit entry
5. **Given** a completed task, **When** CLOSE state executes, **Then** all artifacts are moved to /Done with timestamps

---

### User Story 3 - Create and Track Execution Plans (Priority: P2)

As the Digital FTE system, I want to generate Plan.md files with checkboxes that track task progress so that every action has a documented plan before execution.

**Why this priority**: Plans enable traceability and human oversight. Constitution Article II mandates "No Silent Action" - every action requires a plan.

**Independent Test**: Can be fully tested by triggering plan generation for a task and verifying the Plan.md contains all required sections and checkboxes.

**Acceptance Scenarios**:

1. **Given** a task interpretation, **When** plan generation runs, **Then** a Plan.md file is created with task description, steps as checkboxes, and approval requirements
2. **Given** an existing Plan.md, **When** a step completes, **Then** the corresponding checkbox is marked and timestamp recorded
3. **Given** a Plan.md with all checkboxes complete, **When** verified, **Then** task can proceed to ACT state

---

### User Story 4 - File-Based Approval Workflow (Priority: P2)

As a human operator, I want to approve or reject pending actions by moving files between designated folders so that I maintain control over irreversible actions without needing to interact with a chat interface.

**Why this priority**: Constitution Article IV mandates approval for payments, new recipients, legal communications, social media, and deletions. File movement is the only approval mechanism.

**Independent Test**: Can be fully tested by moving a file from /Plans/pending to /Plans/approved and verifying the system resumes execution.

**Acceptance Scenarios**:

1. **Given** a task requiring approval, **When** reaching APPROVE gate, **Then** system creates file in /Plans/pending and halts
2. **Given** a file in /Plans/pending, **When** human moves it to /Plans/approved, **Then** system detects approval and proceeds to ACT
3. **Given** a file in /Plans/pending, **When** human moves it to /Plans/rejected, **Then** system logs rejection and moves to /Done with rejection status
4. **Given** a file in /Plans/pending for more than 24 hours, **When** checked, **Then** system creates a reminder in /Needs_Action

---

### User Story 5 - Immutable Audit Logging (Priority: P2)

As a system auditor, I want every action to be logged with timestamp, attribution, and details in append-only log files so that I can trace any system action back to its origin.

**Why this priority**: Constitution Article II Section 2.8 mandates every action be logged, timestamped, attributable, and reversible where possible.

**Independent Test**: Can be fully tested by executing any action and verifying a corresponding audit entry exists with all required fields.

**Acceptance Scenarios**:

1. **Given** any state transition in the cognitive loop, **When** transition completes, **Then** an audit entry is appended to /Logs with timestamp, state, task ID, and outcome
2. **Given** an audit log file, **When** attempting to modify past entries, **Then** operation fails (append-only enforcement)
3. **Given** audit entries, **When** queried by task ID, **Then** complete execution history is retrievable in chronological order

---

### User Story 6 - Error Escalation (Priority: P3)

As the Digital FTE system, I want to escalate errors by creating ERROR_*.md files in /Needs_Action so that failures are surfaced for human review without blocking other tasks.

**Why this priority**: Constitution Article VI mandates writing failure reports and escalating via /Needs_Action/ERROR_*.md. This prevents silent failures.

**Independent Test**: Can be fully tested by triggering an error condition and verifying an ERROR file is created with proper details.

**Acceptance Scenarios**:

1. **Given** any unhandled error during cognitive loop execution, **When** error occurs, **Then** ERROR_[timestamp]_[task-id].md is created in /Needs_Action
2. **Given** an error file, **When** created, **Then** it contains: error type, stack trace/details, task context, suggested remediation options
3. **Given** an ambiguous situation (per Article VI.2), **When** detected, **Then** system creates error file with proposed options and awaits human instruction

---

### Edge Cases

- What happens when /Needs_Action contains malformed .md files? System creates ERROR file and moves malformed file to /Done/invalid/
- What happens when vault storage is full? System logs error, halts processing, creates high-priority alert
- What happens when a task file is modified while being processed? System uses file locking or detects modification and restarts processing
- What happens when multiple tasks arrive simultaneously? System processes in FIFO order based on file creation timestamp
- What happens when human never approves a pending task? Task remains pending; reminder created after 24h; escalation after 72h

## Requirements *(mandatory)*

### Functional Requirements

**Vault Structure**
- **FR-001**: System MUST create and maintain these directories: /Needs_Action, /Plans, /Plans/pending, /Plans/approved, /Plans/rejected, /Accounting, /Done, /Done/invalid, /Logs
- **FR-002**: System MUST perform idempotent vault initialization (safe to run multiple times)
- **FR-003**: System MUST verify vault integrity on startup and log any anomalies

**Cognitive Loop**
- **FR-004**: System MUST implement the 8-step cognitive loop: WATCH, WRITE, REASON, PLAN, APPROVE, ACT, LOG, CLOSE
- **FR-005**: System MUST NOT skip any step in the cognitive loop sequence
- **FR-006**: System MUST track current state for each task and persist state to disk
- **FR-007**: System MUST define completion by state change to /Done, not by model output

**Plan Management**
- **FR-008**: System MUST generate Plan.md files with: task description, checkbox steps, approval requirements, timestamps
- **FR-009**: System MUST update checkbox status in Plan.md as steps complete
- **FR-010**: System MUST validate all checkboxes complete before transitioning from PLAN to ACT (when no approval needed) or APPROVE (when approval needed)

**Approval Workflow**
- **FR-011**: System MUST halt at APPROVE state for tasks matching Article IV criteria (payments, new recipients, legal/emotional communication, social media, external deletions)
- **FR-012**: System MUST detect file movement as approval/rejection signal
- **FR-013**: System MUST resume processing within 5 seconds of detecting approval
- **FR-014**: System MUST log rejection reason when file moved to /Plans/rejected

**Audit Logging**
- **FR-015**: System MUST create audit entry for every state transition
- **FR-016**: Audit entries MUST include: timestamp (ISO 8601), task_id, previous_state, new_state, actor (system/human), outcome, details
- **FR-017**: Audit logs MUST be append-only (no modification or deletion of past entries)
- **FR-018**: System MUST maintain daily audit log files in /Logs/YYYY-MM-DD.log.md

**Error Handling**
- **FR-019**: System MUST create ERROR_[timestamp]_[task-id].md in /Needs_Action for unhandled errors
- **FR-020**: Error files MUST contain: error_type, details, task_context, suggested_options
- **FR-021**: System MUST NOT retry failed tasks automatically without human review
- **FR-022**: System MUST continue processing other tasks when one task fails

### Key Entities

- **Task**: Represents work item flowing through the cognitive loop. Attributes: id, title, source (watcher type), created_at, current_state, priority, requires_approval, plan_path
- **Plan**: Execution plan for a task. Attributes: task_id, steps (list of checkboxes), approval_status, created_at, approved_at, completed_at
- **AuditEntry**: Immutable record of system activity. Attributes: timestamp, task_id, state_from, state_to, actor, outcome, details
- **ErrorReport**: Escalation record for failures. Attributes: id, timestamp, task_id, error_type, details, context, suggested_options, resolution_status

### Assumptions

- Obsidian Vault is a local filesystem directory (not cloud-synced for sensitive operations)
- File system supports file locking or atomic operations for concurrent access safety
- Human operators have filesystem access to move files between folders
- System runs continuously with process manager (PM2/systemd) for restart safety
- Daily log rotation is acceptable; logs older than 90 days may be archived

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vault initialization completes in under 2 seconds for new or existing vaults
- **SC-002**: 100% of tasks pass through all 8 cognitive loop states with audit trail
- **SC-003**: Zero tasks skip any cognitive loop step (enforced by state machine)
- **SC-004**: Approval detection latency under 5 seconds after file movement
- **SC-005**: 100% of errors result in ERROR_*.md file creation (no silent failures)
- **SC-006**: Audit logs enable complete reconstruction of any task's execution history
- **SC-007**: System processes at least 100 tasks per hour under normal operation
- **SC-008**: System recovers and resumes processing within 30 seconds after restart
