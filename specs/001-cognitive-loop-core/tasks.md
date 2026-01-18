# Tasks: Vault Structure and Cognitive Loop Core

**Input**: Design documents from `/specs/001-cognitive-loop-core/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths based on plan.md structure

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize TypeScript project with required dependencies

- [x] T001 Create project directory structure per plan.md in src/, tests/
- [x] T002 Initialize Node.js project with package.json (name: digital-fte-core, type: module)
- [x] T003 [P] Install runtime dependencies: xstate@5, chokidar@3, gray-matter@4, remark@15, pino@9, proper-lockfile@4, uuid@9
- [x] T004 [P] Install dev dependencies: typescript@5, vitest@2, @types/node@20, tsx
- [x] T005 [P] Configure TypeScript with tsconfig.json (strict mode, ES2022 target, NodeNext module)
- [x] T006 [P] Configure Vitest with vitest.config.ts
- [x] T007 Create PM2 ecosystem file ecosystem.config.cjs for process management
- [x] T008 Add npm scripts to package.json: start, start:pm2, stop, vault:init, vault:status, test

**Checkpoint**: Project builds with `npm run build` (no source files yet, but config works)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and utilities that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 [P] Create enum types in src/types/enums.ts (TaskSource, TaskState, Priority, ApprovalStatus, Actor, Outcome, Severity, ResolutionStatus)
- [ ] T010 [P] Create Task interface in src/types/task.ts per data-model.md
- [ ] T011 [P] Create Plan and PlanStep interfaces in src/types/plan.ts per data-model.md
- [ ] T012 [P] Create AuditEntry interface in src/types/audit.ts per data-model.md
- [ ] T013 [P] Create ErrorReport interface in src/types/error.ts per data-model.md
- [ ] T014 [P] Create VaultConfig interface in src/types/config.ts per contracts
- [ ] T015 Create type re-exports in src/types/index.ts
- [ ] T016 [P] Create custom error classes in src/lib/errors.ts (VaultInitError, StateTransitionError, TaskNotFoundError, PlanValidationError, AuditIntegrityError)
- [ ] T017 [P] Create markdown utilities in src/lib/markdown.ts (parseFrontmatter, updateFrontmatter, parseCheckboxes, updateCheckbox)
- [ ] T018 [P] Create file locking utilities in src/lib/filelock.ts (acquireLock, releaseLock, withLock)
- [ ] T019 [P] Create checksum utilities in src/lib/checksum.ts (sha256, verifyChecksum)
- [ ] T020 Create configuration loader in src/config.ts (loadConfig, getVaultPaths)

**Checkpoint**: Foundation ready - all types compile, utilities have basic implementations

---

## Phase 3: User Story 1 - Initialize Vault Structure (Priority: P1)

**Goal**: Create and verify vault directory structure for Digital FTE operations

**Independent Test**: Run `npm run vault:init` and verify all directories exist at VAULT_PATH

### Implementation for User Story 1

- [ ] T021 [US1] Create vault initialization in src/modules/vault/init.ts (initialize function that creates all directories idempotently)
- [ ] T022 [US1] Create vault integrity verification in src/modules/vault/verify.ts (verifyIntegrity function returns VaultAnomaly[])
- [ ] T023 [US1] Create vault status check in src/modules/vault/status.ts (getStatus function returns VaultStatus)
- [ ] T024 [US1] Create vault module exports in src/modules/vault/index.ts
- [ ] T025 [US1] Create CLI init command in src/cli/commands/init.ts (handles VAULT_PATH env, calls vault.initialize)
- [ ] T026 [US1] Create CLI status command in src/cli/commands/status.ts (calls vault.getStatus, formats output)

**Checkpoint**: `npm run vault:init` creates all 10 directories, `npm run vault:status` shows health

---

## Phase 4: User Story 2 - Process Task Through Cognitive Loop (Priority: P1)

**Goal**: Implement the 8-step cognitive loop state machine that processes tasks

**Independent Test**: Place a .md file in /Needs_Action and observe state transitions in logs

### Implementation for User Story 2

- [ ] T027 [US2] Define XState machine in src/modules/loop/machine.ts with 8 states (WATCH, WRITE, REASON, PLAN, APPROVE, ACT, LOG, CLOSE) and guards preventing step skipping
- [ ] T028 [US2] Create file watcher in src/modules/loop/watcher.ts using chokidar (watch /Needs_Action for new .md files)
- [ ] T029 [US2] Create task creation in src/modules/task/create.ts (create function parses .md, generates UUID, sets initial state)
- [ ] T030 [US2] Create task reading in src/modules/task/read.ts (getById, listByState functions)
- [ ] T031 [US2] Create state transition logic in src/modules/task/transition.ts (transition function updates state, persists to file)
- [ ] T032 [US2] Create approval checker in src/modules/task/approval.ts (requiresApproval function checks Article IV criteria)
- [ ] T033 [US2] Create task completion in src/modules/task/complete.ts (complete function moves task to /Done with status)
- [ ] T034 [US2] Create task module exports in src/modules/task/index.ts
- [ ] T035 [US2] Create task processor in src/modules/loop/processor.ts (processTask orchestrates state machine for single task)
- [ ] T036 [US2] Create cognitive loop orchestrator in src/modules/loop/index.ts (start, stop, getStatus, onStateChange)
- [ ] T037 [US2] Create CLI start command in src/cli/commands/start.ts (initializes vault, starts loop)
- [ ] T038 [US2] Create CLI stop command in src/cli/commands/stop.ts (graceful shutdown)

**Checkpoint**: Task placed in /Needs_Action transitions through all 8 states to /Done

---

## Phase 5: User Story 3 - Create and Track Execution Plans (Priority: P2)

**Goal**: Generate Plan.md files with checkboxes that track task progress

**Independent Test**: Trigger plan generation and verify Plan.md has checkboxes and required sections

### Implementation for User Story 3

- [ ] T039 [US3] Create plan generation in src/modules/plan/generate.ts (create function generates Plan.md with checkboxes)
- [ ] T040 [US3] Create plan reading in src/modules/plan/read.ts (getByTaskId function)
- [ ] T041 [US3] Create checkbox update in src/modules/plan/update.ts (completeStep function marks checkbox, adds timestamp)
- [ ] T042 [US3] Create plan completion check in src/modules/plan/validate.ts (isComplete function verifies all checkboxes marked)
- [ ] T043 [US3] Create plan module exports in src/modules/plan/index.ts
- [ ] T044 [US3] Integrate plan generation into PLAN state handler in src/modules/loop/processor.ts

**Checkpoint**: Tasks generate Plan.md files, checkboxes update as steps complete

---

## Phase 6: User Story 4 - File-Based Approval Workflow (Priority: P2)

**Goal**: Enable approval/rejection by moving files between /Plans/pending, /approved, /rejected

**Independent Test**: Move file from /Plans/pending to /Plans/approved and verify task proceeds to ACT

### Implementation for User Story 4

- [ ] T045 [US4] Create approval submission in src/modules/plan/approval.ts (submitForApproval moves plan to /Plans/pending)
- [ ] T046 [US4] Create approval status checker in src/modules/plan/approval.ts (checkApprovalStatus detects file location)
- [ ] T047 [US4] Create approval folder watcher in src/modules/loop/watcher.ts (watch /Plans/pending, /approved, /rejected)
- [ ] T048 [US4] Integrate approval gate into APPROVE state handler in src/modules/loop/processor.ts (halt until approved)
- [ ] T049 [US4] Handle rejection flow in src/modules/loop/processor.ts (move to /Done with rejection status)
- [ ] T050 [US4] Add reminder creation for stale pending tasks (24h) in src/modules/plan/approval.ts

**Checkpoint**: Approval detected within 5 seconds of file move, rejection logs reason

---

## Phase 7: User Story 5 - Immutable Audit Logging (Priority: P2)

**Goal**: Log every state transition with timestamp, task ID, actor, outcome in append-only files

**Independent Test**: Execute any action and verify audit entry exists in /Logs/YYYY-MM-DD.log.md

### Implementation for User Story 5

- [ ] T051 [US5] Create audit logging in src/modules/audit/log.ts (log function appends entry with checksum)
- [ ] T052 [US5] Create audit query by task in src/modules/audit/query.ts (getByTaskId function)
- [ ] T053 [US5] Create audit query by date in src/modules/audit/query.ts (getByDate function)
- [ ] T054 [US5] Create audit integrity verification in src/modules/audit/verify.ts (verifyIntegrity checks checksums)
- [ ] T055 [US5] Create audit module exports in src/modules/audit/index.ts
- [ ] T056 [US5] Integrate audit logging into state transitions in src/modules/loop/processor.ts (log on every state change)

**Checkpoint**: Every state transition creates audit entry, checksums validate

---

## Phase 8: User Story 6 - Error Escalation (Priority: P3)

**Goal**: Create ERROR_*.md files in /Needs_Action for failures requiring human review

**Independent Test**: Trigger an error and verify ERROR file created with details and options

### Implementation for User Story 6

- [ ] T057 [US6] Create error report generation in src/modules/error/report.ts (create function generates ERROR_*.md)
- [ ] T058 [US6] Create open error listing in src/modules/error/report.ts (listOpen function)
- [ ] T059 [US6] Create error resolution in src/modules/error/report.ts (resolve function updates status)
- [ ] T060 [US6] Create error module exports in src/modules/error/index.ts
- [ ] T061 [US6] Integrate error escalation into processor in src/modules/loop/processor.ts (catch errors, create report, continue other tasks)
- [ ] T062 [US6] Handle ambiguity detection in src/modules/loop/processor.ts (create error with proposed options)

**Checkpoint**: Errors create files with suggested options, other tasks continue processing

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, CLI completion, documentation

- [ ] T063 [P] Create main entry point in src/index.ts (re-exports all modules)
- [ ] T064 [P] Create CLI entry in src/cli/index.ts (commander setup with all commands)
- [ ] T065 Add graceful shutdown handling in src/cli/commands/start.ts (SIGINT/SIGTERM handlers)
- [ ] T066 Create test fixtures vault in tests/fixtures/vault/ with sample structure
- [ ] T067 Validate against quickstart.md scenarios (manual verification)
- [ ] T068 Run full integration test: init vault, create task, observe full loop completion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - can start after T020
- **User Story 2 (Phase 4)**: Depends on Foundational AND User Story 1 (needs vault)
- **User Story 3 (Phase 5)**: Depends on User Story 2 (needs task/loop infrastructure)
- **User Story 4 (Phase 6)**: Depends on User Story 3 (needs plan module)
- **User Story 5 (Phase 7)**: Depends on User Story 2 (can run in parallel with US3/US4)
- **User Story 6 (Phase 8)**: Depends on User Story 2 (can run in parallel with US3/US4/US5)
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

```
                    ┌─────────────────────────────────────┐
                    │         Phase 1: Setup              │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │      Phase 2: Foundational          │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │   US1: Initialize Vault (P1)        │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │   US2: Cognitive Loop (P1)          │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
┌─────────▼─────────┐   ┌─────────────▼─────────────┐   ┌─────────▼─────────┐
│ US3: Plans (P2)   │   │    US5: Audit (P2)        │   │ US6: Errors (P3)  │
└─────────┬─────────┘   └───────────────────────────┘   └───────────────────┘
          │
┌─────────▼─────────┐
│ US4: Approval (P2)│
└───────────────────┘
```

### Within Each User Story

- Models/Types before services
- Services before integration
- Core implementation before CLI commands
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T003, T004, T005, T006 can run in parallel
```

**Phase 2 (Foundational)**:
```
T009, T010, T011, T012, T013, T014 can run in parallel (all type files)
T016, T017, T018, T019 can run in parallel (all lib files)
```

**User Stories US3, US5, US6 can run in parallel** (after US2 complete):
```
Team A: US3 (Plans) → US4 (Approval)
Team B: US5 (Audit)
Team C: US6 (Errors)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Vault Init)
4. Complete Phase 4: User Story 2 (Cognitive Loop)
5. **STOP and VALIDATE**: Task flows through all 8 states with basic logging
6. This is a working MVP that demonstrates the core cognitive loop

### Incremental Delivery

1. Setup + Foundational + US1 + US2 → MVP with basic cognitive loop
2. Add US3 (Plans) → Tasks now generate Plan.md with checkboxes
3. Add US4 (Approval) → HITL approval workflow functional
4. Add US5 (Audit) → Full audit trail with checksums
5. Add US6 (Errors) → Robust error handling
6. Polish → Production-ready daemon

### Single Developer Strategy

1. Phases 1-2: Setup foundation (T001-T020)
2. Phase 3: Vault initialization (T021-T026)
3. Phase 4: Core loop (T027-T038) ← MVP milestone
4. Phase 5: Plans (T039-T044)
5. Phase 6: Approval (T045-T050)
6. Phase 7: Audit (T051-T056)
7. Phase 8: Errors (T057-T062)
8. Phase 9: Polish (T063-T068)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP is achievable with just Phases 1-4 (Setup, Foundation, US1, US2)
