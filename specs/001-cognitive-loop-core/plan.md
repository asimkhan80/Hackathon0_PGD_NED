# Implementation Plan: Vault Structure and Cognitive Loop Core

**Branch**: `001-cognitive-loop-core` | **Date**: 2026-01-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-cognitive-loop-core/spec.md`

## Summary

Build the foundational infrastructure for the Digital FTE system: an 8-step cognitive loop
state machine (WATCH-WRITE-REASON-PLAN-APPROVE-ACT-LOG-CLOSE) operating on an Obsidian vault
with file-based state management, markdown plans with checkboxes, immutable audit logging,
file-movement approval workflow, and error escalation.

**Technical Approach**: TypeScript/Node.js with XState for state machine, chokidar for file
watching, and PM2 for process management. All state persisted to markdown files.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS
**Primary Dependencies**: XState 5.x (FSM), chokidar 3.x (file watching), gray-matter 4.x (markdown), pino 9.x (logging)
**Storage**: Local filesystem (Obsidian vault) - markdown files with YAML frontmatter
**Testing**: Vitest 2.x with integration tests against test vault
**Target Platform**: Windows/Linux/macOS (cross-platform via Node.js)
**Project Type**: Single project (CLI daemon)
**Performance Goals**: Process 100+ tasks/hour, <5s approval detection latency
**Constraints**: Local-first (no cloud dependencies), append-only audit logs
**Scale/Scope**: Single vault, single user, continuous daemon operation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Implementation |
|---------|-------------|--------|----------------|
| I. Role & Authority | Read/write only from vault | PASS | All file ops scoped to VAULT_PATH |
| II. Operating Principles | File-first reality, no silent action | PASS | State persisted to .md files, all actions logged |
| III. Cognitive Loop | 8-step sequence, no skipping | PASS | XState FSM enforces transitions |
| IV. Autonomy Boundaries | Approval for payments, comms, etc. | PASS | `requiresApproval()` function checks criteria |
| V. Ralph Wiggum Loop | Persist until completion | PASS | Task state survives restart via file persistence |
| VI. Error Handling | No auto-retry, escalate via ERROR_*.md | PASS | Errors create files, require human review |
| VII. Ethics | Refuse when dignity/irreversibility | PASS | Approval required for sensitive actions |
| IX. Termination | Human override available | PASS | PM2 stop + graceful shutdown |

**Post-Design Re-check**: All gates still pass after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/001-cognitive-loop-core/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technology decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Usage guide
├── contracts/           # API contracts
│   └── cognitive-loop-api.md
├── checklists/
│   └── requirements.md  # Spec validation
└── tasks.md             # Implementation tasks (created by /sp.tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts             # Entry point
├── config.ts            # Configuration loader
├── types/
│   ├── index.ts         # Re-exports
│   ├── task.ts          # Task types
│   ├── plan.ts          # Plan types
│   ├── audit.ts         # Audit types
│   └── error.ts         # Error types
├── modules/
│   ├── vault/
│   │   ├── index.ts     # Vault module exports
│   │   ├── init.ts      # Vault initialization
│   │   └── verify.ts    # Integrity verification
│   ├── task/
│   │   ├── index.ts     # Task module exports
│   │   ├── create.ts    # Task creation
│   │   ├── read.ts      # Task reading
│   │   ├── transition.ts # State transitions
│   │   └── approval.ts  # Approval checking
│   ├── plan/
│   │   ├── index.ts     # Plan module exports
│   │   ├── generate.ts  # Plan generation
│   │   ├── update.ts    # Checkbox updates
│   │   └── approval.ts  # Approval workflow
│   ├── audit/
│   │   ├── index.ts     # Audit module exports
│   │   ├── log.ts       # Append-only logging
│   │   └── query.ts     # Log queries
│   ├── error/
│   │   ├── index.ts     # Error module exports
│   │   └── report.ts    # Error file creation
│   └── loop/
│       ├── index.ts     # Cognitive loop exports
│       ├── machine.ts   # XState FSM definition
│       ├── watcher.ts   # File watching
│       └── processor.ts # Task processing
├── cli/
│   ├── index.ts         # CLI entry
│   ├── commands/
│   │   ├── start.ts     # Start loop
│   │   ├── stop.ts      # Stop loop
│   │   ├── init.ts      # Initialize vault
│   │   └── status.ts    # Show status
│   └── utils.ts         # CLI helpers
└── lib/
    ├── markdown.ts      # Markdown utilities
    ├── filelock.ts      # File locking
    └── checksum.ts      # SHA-256 for audit

tests/
├── fixtures/
│   └── vault/           # Test vault structure
├── unit/
│   ├── task.test.ts
│   ├── plan.test.ts
│   ├── audit.test.ts
│   └── machine.test.ts
├── integration/
│   ├── cognitive-loop.test.ts
│   └── approval-flow.test.ts
└── setup.ts             # Test setup
```

**Structure Decision**: Single project structure chosen because:
- No web frontend (daemon only)
- No separate API server (file-based communication)
- CLI interface for human operators

## Complexity Tracking

> No violations requiring justification. Design follows constitution principles.

| Check | Result | Notes |
|-------|--------|-------|
| Single project | PASS | No unnecessary separation |
| File-based state | PASS | Aligns with Article II |
| XState for FSM | JUSTIFIED | Prevents state skipping (Article III requirement) |
| PM2 for daemon | JUSTIFIED | Restart-safe requirement from Architectural Requirements |

## Phase Outputs

| Phase | Artifact | Status | Path |
|-------|----------|--------|------|
| Phase 0 | research.md | Complete | `specs/001-cognitive-loop-core/research.md` |
| Phase 1 | data-model.md | Complete | `specs/001-cognitive-loop-core/data-model.md` |
| Phase 1 | contracts/ | Complete | `specs/001-cognitive-loop-core/contracts/` |
| Phase 1 | quickstart.md | Complete | `specs/001-cognitive-loop-core/quickstart.md` |
| Phase 2 | tasks.md | Pending | Run `/sp.tasks` to generate |

## Architecture Decisions

### ADR Candidates

The following decisions may warrant formal ADRs:

1. **XState for State Machine**: Using formal FSM library vs custom implementation
2. **File-Based Approval**: Using file movement vs database flags for HITL
3. **Append-Only Audit**: Markdown logs vs SQLite for audit trail

Suggest running `/sp.adr` if formal documentation is desired.

## Next Steps

Run `/sp.tasks` to generate implementation tasks based on this plan.
