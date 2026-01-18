# Data Model: Vault Structure and Cognitive Loop Core

**Feature**: 001-cognitive-loop-core
**Date**: 2026-01-17
**Source**: spec.md Key Entities section

## Entities

### Task

Represents a work item flowing through the cognitive loop.

**Storage**: Individual markdown files in vault directories

**Attributes**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID v4) |
| title | string | Yes | Human-readable task title |
| source | enum | Yes | Origin watcher: gmail, whatsapp, filesystem, finance, manual |
| created_at | ISO 8601 | Yes | Timestamp when task entered /Needs_Action |
| current_state | enum | Yes | WATCH, WRITE, REASON, PLAN, APPROVE, ACT, LOG, CLOSE |
| priority | enum | No | low, normal, high, urgent (default: normal) |
| requires_approval | boolean | Yes | Whether task matches Article IV criteria |
| plan_path | string | No | Relative path to Plan.md file |
| error_count | number | No | Number of times task encountered errors |
| last_error | string | No | Most recent error message |

**State Values**:
- `WATCH`: Task detected, awaiting processing
- `WRITE`: Creating interpretation record
- `REASON`: Analyzing intent and requirements
- `PLAN`: Generating Plan.md with checkboxes
- `APPROVE`: Awaiting human approval (if required)
- `ACT`: Executing planned actions
- `LOG`: Writing audit entry
- `CLOSE`: Moving artifacts to /Done

**Validation Rules**:
- `id` must be valid UUID v4 format
- `current_state` transitions must follow sequence (no skipping)
- `requires_approval` must be true if task involves: payments, new recipients, legal/emotional communication, social media, external deletions
- `plan_path` must exist when `current_state` >= PLAN

**File Format (YAML frontmatter + markdown body)**:
```yaml
---
id: 550e8400-e29b-41d4-a716-446655440000
title: "Reply to client email about invoice"
source: gmail
created_at: 2026-01-17T10:30:00Z
current_state: PLAN
priority: normal
requires_approval: true
plan_path: Plans/550e8400-plan.md
---

# Task: Reply to client email about invoice

## Original Content
[Email content here]

## Interpretation
[System's understanding of the task]
```

---

### Plan

Execution plan for a task with checkbox-based progress tracking.

**Storage**: Markdown files in /Plans directory

**Attributes**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| task_id | string | Yes | Reference to parent Task |
| steps | array | Yes | List of PlanStep objects |
| approval_status | enum | Yes | pending, approved, rejected, not_required |
| created_at | ISO 8601 | Yes | When plan was generated |
| approved_at | ISO 8601 | No | When human approved (if applicable) |
| approved_by | string | No | Identifier of approver |
| completed_at | ISO 8601 | No | When all steps finished |
| rejection_reason | string | No | Why plan was rejected |

**PlanStep Sub-entity**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| step_id | number | Yes | Sequential step number |
| description | string | Yes | What this step does |
| completed | boolean | Yes | Checkbox state |
| completed_at | ISO 8601 | No | When step was marked done |
| outcome | string | No | Result of step execution |

**Validation Rules**:
- `task_id` must reference existing Task
- `steps` must have at least one entry
- `approval_status` must be `approved` or `not_required` before ACT state
- `completed_at` only set when all steps have `completed: true`

**File Format**:
```yaml
---
task_id: 550e8400-e29b-41d4-a716-446655440000
approval_status: pending
created_at: 2026-01-17T10:35:00Z
---

# Plan: Reply to client email about invoice

## Approval Required
This task involves **email communication** (Article IV).
Move this file to `/Plans/approved/` to proceed.

## Steps

- [ ] 1. Draft email response acknowledging invoice receipt
- [ ] 2. Include payment timeline (net 30)
- [ ] 3. Send via Gmail MCP server
- [ ] 4. Log confirmation to /Accounting

## Risk Assessment
- Reversibility: Email cannot be unsent
- Financial impact: None (acknowledgment only)
```

---

### AuditEntry

Immutable record of system activity for compliance and debugging.

**Storage**: Append-only markdown files in /Logs (daily rotation)

**Attributes**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | ISO 8601 | Yes | When event occurred |
| task_id | string | Yes | Related task (or "SYSTEM" for global events) |
| state_from | string | No | Previous state (null for new tasks) |
| state_to | string | Yes | New state or event type |
| actor | enum | Yes | system, human, mcp |
| outcome | enum | Yes | success, failure, pending |
| details | string | No | Additional context |
| checksum | string | Yes | SHA-256 of entry for integrity |

**Validation Rules**:
- `timestamp` must be monotonically increasing within file
- `checksum` must validate against entry content
- File must be append-only (no modification of past entries)

**File Format** (/Logs/2026-01-17.log.md):
```markdown
# Audit Log: 2026-01-17

| Timestamp | Task ID | From | To | Actor | Outcome | Details |
|-----------|---------|------|-----|-------|---------|---------|
| 10:30:00Z | 550e8400 | - | WATCH | system | success | New task from gmail watcher |
| 10:30:01Z | 550e8400 | WATCH | WRITE | system | success | Interpretation started |
| 10:35:00Z | 550e8400 | PLAN | APPROVE | system | pending | Awaiting human approval |
| 10:42:00Z | 550e8400 | APPROVE | ACT | human | success | Approved by file move |
```

---

### ErrorReport

Escalation record for failures requiring human intervention.

**Storage**: Individual markdown files in /Needs_Action

**Attributes**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique error ID (UUID v4) |
| timestamp | ISO 8601 | Yes | When error occurred |
| task_id | string | No | Related task (null for system errors) |
| error_type | string | Yes | Classification of error |
| severity | enum | Yes | low, medium, high, critical |
| details | string | Yes | Technical error information |
| context | string | Yes | What the system was doing |
| suggested_options | array | Yes | List of remediation options |
| resolution_status | enum | Yes | open, acknowledged, resolved, ignored |
| resolved_at | ISO 8601 | No | When error was resolved |
| resolution_notes | string | No | How error was resolved |

**Error Types**:
- `TaskProcessingError`: Error during cognitive loop execution
- `MCPError`: MCP server communication failure
- `ValidationError`: Invalid task or plan format
- `StateTransitionError`: Illegal state transition attempted
- `FileSystemError`: Vault read/write failure
- `AmbiguityError`: System cannot determine action without human input

**Validation Rules**:
- `suggested_options` must have at least 2 entries
- `severity` is `critical` if task involves money or identity
- File naming: `ERROR_[timestamp]_[task-id].md`

**File Format**:
```yaml
---
id: err-550e8400-1
timestamp: 2026-01-17T10:40:00Z
task_id: 550e8400-e29b-41d4-a716-446655440000
error_type: MCPError
severity: high
resolution_status: open
---

# Error: MCP Server Timeout

## Context
Task "Reply to client email about invoice" failed during ACT state.
The Gmail MCP server did not respond within 30 seconds.

## Technical Details
```
Error: ETIMEDOUT
Endpoint: mcp://gmail/send
Timeout: 30000ms
Retry count: 0 (no auto-retry per Article VI)
```

## Suggested Options

1. **Retry manually**: Move this file to /Done and re-queue the task
2. **Check MCP server**: Verify Gmail MCP server is running
3. **Mark as failed**: Move task to /Done/failed with notes
4. **Escalate**: Contact system administrator

## Resolution
[To be filled by human operator]
```

---

## Relationships

```
Task (1) ──────────> (1) Plan
  │                      │
  │                      │
  └──────> (0..n) AuditEntry
  │
  └──────> (0..n) ErrorReport
```

- One Task has exactly one Plan (created during PLAN state)
- One Task has zero or more AuditEntries (one per state transition)
- One Task has zero or more ErrorReports (one per error occurrence)
- AuditEntries reference Tasks but are stored in separate daily log files
- ErrorReports are independent files that reference Tasks

## State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                      COGNITIVE LOOP FSM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────┐     ┌───────┐     ┌────────┐     ┌──────┐          │
│   │ WATCH │────▶│ WRITE │────▶│ REASON │────▶│ PLAN │          │
│   └───────┘     └───────┘     └────────┘     └──┬───┘          │
│                                                  │               │
│                                    ┌─────────────┴───────────┐   │
│                                    ▼                         ▼   │
│                           requires_approval?                     │
│                              /          \                        │
│                            yes           no                      │
│                            /              \                      │
│                    ┌─────────┐         ┌─────┐                  │
│                    │ APPROVE │         │     │                  │
│                    └────┬────┘         │     │                  │
│                         │              │     │                  │
│              ┌──────────┼──────────┐   │     │                  │
│              ▼          │          ▼   │     │                  │
│         [pending]       │     [rejected]│     │                  │
│              │          │          │   │     │                  │
│              ▼          │          ▼   ▼     │                  │
│         [approved]      │       /Done  │     │                  │
│              │          │              │     │                  │
│              └──────────┴──────────────┴─────┘                  │
│                                │                                 │
│                                ▼                                 │
│                           ┌─────┐                               │
│                           │ ACT │                               │
│                           └──┬──┘                               │
│                              │                                   │
│                              ▼                                   │
│                           ┌─────┐                               │
│                           │ LOG │                               │
│                           └──┬──┘                               │
│                              │                                   │
│                              ▼                                   │
│                          ┌───────┐                              │
│                          │ CLOSE │──────▶ /Done                 │
│                          └───────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Vault Directory Structure

```
/Vault/
├── Needs_Action/           # Tasks awaiting processing (WATCH state)
│   ├── task_*.md           # Incoming tasks from watchers
│   └── ERROR_*.md          # Error reports for human review
│
├── Plans/                  # Execution plans
│   ├── pending/            # Awaiting approval (APPROVE state)
│   ├── approved/           # Human approved
│   ├── rejected/           # Human rejected
│   └── *.md                # Active plans (not requiring approval)
│
├── Accounting/             # Financial records
│   └── *.md                # Transaction logs
│
├── Done/                   # Completed tasks
│   ├── invalid/            # Malformed files
│   ├── failed/             # Failed tasks
│   └── *.md                # Successfully completed
│
├── Logs/                   # Audit logs
│   └── YYYY-MM-DD.log.md   # Daily audit files
│
└── Company_Handbook.md     # Constitution
```
