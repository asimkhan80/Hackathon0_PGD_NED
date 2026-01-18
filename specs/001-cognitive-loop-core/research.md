# Research: Vault Structure and Cognitive Loop Core

**Feature**: 001-cognitive-loop-core
**Date**: 2026-01-17
**Status**: Complete

## Technology Decisions

### 1. Programming Language

**Decision**: TypeScript with Node.js 20 LTS

**Rationale**:
- Native file system watching via `chokidar` or `fs.watch`
- Excellent async/await support for non-blocking file operations
- First-class PM2 integration for process management
- Strong typing prevents runtime errors in state machine logic
- Cross-platform (Windows, Linux, macOS)
- Large ecosystem for markdown parsing (remark, gray-matter)

**Alternatives Considered**:
- Python 3.11+: Good ecosystem but GIL limits true concurrency; asyncio less mature than Node.js event loop
- Go: Excellent for daemons but markdown/YAML ecosystem less mature; compilation step adds friction
- Rust: Overkill for file operations; steeper learning curve

### 2. File Watching Strategy

**Decision**: `chokidar` library with polling fallback

**Rationale**:
- `chokidar` provides cross-platform file watching with consistent API
- Handles edge cases (atomic writes, rapid changes) better than native `fs.watch`
- Built-in debouncing prevents duplicate events
- Polling fallback for network drives and Obsidian vault sync scenarios

**Alternatives Considered**:
- Native `fs.watch`: Inconsistent behavior across platforms; misses some events
- `node-watch`: Less mature; fewer edge case handlers
- `watchman` (Facebook): Requires separate daemon installation; overkill for single vault

### 3. State Machine Implementation

**Decision**: XState v5 for state machine management

**Rationale**:
- Formal state machine with guards, actions, and services
- Prevents illegal state transitions (constitution requirement: no skipped steps)
- Built-in persistence via state snapshots
- Visualization tools for debugging state flow
- TypeScript-first with excellent type inference

**Alternatives Considered**:
- Custom state machine: More code to maintain; easy to introduce bugs
- Robot3: Simpler but lacks persistence and guards
- Redux: Overkill; not designed for state machines

### 4. Markdown Processing

**Decision**: `gray-matter` for frontmatter + `remark` for content

**Rationale**:
- `gray-matter` parses YAML frontmatter (task metadata, plan checkboxes)
- `remark` provides AST manipulation for checkbox updates
- Both are well-maintained with active communities
- Supports Obsidian-compatible markdown

**Alternatives Considered**:
- `markdown-it`: Good parser but no AST manipulation
- `marked`: Fast but limited extensibility
- Custom parsing: Error-prone; reinventing the wheel

### 5. Logging Strategy

**Decision**: Append-only markdown log files + `pino` for structured logging

**Rationale**:
- Markdown logs are human-readable in Obsidian (audit trail browsable)
- `pino` provides fast structured logging for debugging
- Append-only enforced via file flags (O_APPEND)
- Daily rotation built into filename pattern

**Alternatives Considered**:
- Winston: Slower; more complex configuration
- SQLite: Not markdown-native; violates "Memory = Markdown" principle
- Bunyan: Less maintained than pino

### 6. Process Management

**Decision**: PM2 ecosystem file with graceful shutdown

**Rationale**:
- PM2 handles automatic restarts on crash
- Built-in log rotation and monitoring
- Cluster mode available for future scaling
- Graceful shutdown preserves in-flight task state

**Alternatives Considered**:
- systemd: Linux-only; less portable
- Docker: Adds complexity; not needed for local-first
- forever: Less feature-rich than PM2

### 7. File Locking Strategy

**Decision**: `proper-lockfile` with stale lock detection

**Rationale**:
- Prevents concurrent modification of task files
- Stale lock detection handles crash scenarios
- Cross-platform support
- Simple API

**Alternatives Considered**:
- `lockfile`: Deprecated
- Advisory locks (flock): Not portable to Windows
- Database transactions: Violates file-first principle

## Architecture Decisions

### 8. Cognitive Loop as Finite State Machine

**Decision**: Each task is an independent FSM instance

**Rationale**:
- Tasks can be processed in parallel without interference
- State is persisted to task file's frontmatter
- Recovery on restart: reload task states from files
- Constitution compliance: state change defines completion

**State Diagram**:
```
WATCH → WRITE → REASON → PLAN → APPROVE → ACT → LOG → CLOSE
                                   ↓
                              (requires_approval?)
                                   ↓
                              pending → approved/rejected
```

### 9. Approval Detection Mechanism

**Decision**: Poll `/Plans/pending`, `/Plans/approved`, `/Plans/rejected` every 1 second

**Rationale**:
- File movement detection via polling is more reliable than watching
- 1-second interval balances latency (<5s requirement) with CPU usage
- Works with Obsidian sync and manual file managers

**Alternatives Considered**:
- Watch for file deletion + creation: Race conditions with file managers
- inotify/FSEvents: Platform-specific; doesn't detect moves reliably

### 10. Error File Format

**Decision**: Structured YAML frontmatter + markdown body

**Rationale**:
- Frontmatter contains machine-parseable fields
- Body contains human-readable context and options
- Compatible with Obsidian templates and queries

**Example**:
```markdown
---
error_type: TaskProcessingError
task_id: task_abc123
timestamp: 2026-01-17T10:30:00Z
severity: high
---

# Error: TaskProcessingError

## Context
Task "Send email to client" failed during ACT state.

## Details
MCP server returned timeout after 30 seconds.

## Suggested Options
1. Retry with longer timeout
2. Mark task as failed and archive
3. Escalate to human for manual action
```

## Dependencies Summary

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Runtime | Node.js | 20 LTS | JavaScript runtime |
| File Watching | chokidar | ^3.6 | Cross-platform file watching |
| State Machine | xstate | ^5.0 | FSM for cognitive loop |
| Markdown | gray-matter | ^4.0 | YAML frontmatter parsing |
| Markdown | remark | ^15.0 | Markdown AST manipulation |
| Logging | pino | ^9.0 | Structured logging |
| Process Mgmt | pm2 | ^5.0 | Process management |
| File Locking | proper-lockfile | ^4.0 | Concurrent access safety |
| Testing | vitest | ^2.0 | Unit/integration testing |
| Types | typescript | ^5.0 | Type safety |

## Open Questions (Resolved)

1. ~~Language choice~~ → TypeScript/Node.js
2. ~~State machine library~~ → XState v5
3. ~~File watching approach~~ → chokidar with polling fallback
4. ~~Approval detection~~ → Polling at 1-second interval
