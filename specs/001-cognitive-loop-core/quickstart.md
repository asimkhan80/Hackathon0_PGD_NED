# Quickstart: Cognitive Loop Core

**Feature**: 001-cognitive-loop-core
**Prerequisites**: Node.js 20 LTS, npm/pnpm

## Quick Setup

### 1. Install Dependencies

```bash
# Clone and enter project
cd digital-fte

# Install dependencies
npm install
```

### 2. Initialize Vault

```bash
# Set vault path (example: Obsidian vault location)
export VAULT_PATH="/path/to/your/obsidian/vault"

# Initialize vault structure
npm run vault:init
```

Expected output:
```
Initializing vault at /path/to/your/obsidian/vault
  Created: /Needs_Action
  Created: /Plans
  Created: /Plans/pending
  Created: /Plans/approved
  Created: /Plans/rejected
  Created: /Accounting
  Created: /Done
  Created: /Done/invalid
  Created: /Done/failed
  Created: /Logs
Vault initialization complete.
```

### 3. Start the Cognitive Loop

```bash
# Start in foreground (for development)
npm run start

# Or start with PM2 (for production)
npm run start:pm2
```

Expected output:
```
[CognitiveLoop] Starting...
[CognitiveLoop] Watching: /path/to/vault/Needs_Action
[CognitiveLoop] Watching: /path/to/vault/Plans/pending
[CognitiveLoop] Watching: /path/to/vault/Plans/approved
[CognitiveLoop] Watching: /path/to/vault/Plans/rejected
[CognitiveLoop] Ready. Waiting for tasks...
```

## Basic Usage

### Creating a Task Manually

1. Create a markdown file in `/Needs_Action`:

```markdown
---
title: "Test task"
source: manual
priority: normal
---

# Test Task

This is a test task to verify the cognitive loop is working.

## Action Required
Send a test message.
```

2. Watch the console for state transitions:

```
[Task:abc123] WATCH → WRITE
[Task:abc123] WRITE → REASON
[Task:abc123] REASON → PLAN
[Task:abc123] Plan created at /Plans/abc123-plan.md
[Task:abc123] PLAN → APPROVE (requires approval: external communication)
[Task:abc123] Waiting for approval...
```

### Approving a Task

1. Find the plan file in `/Plans/pending/`
2. Review the plan content
3. Move the file to `/Plans/approved/` to approve
4. Or move to `/Plans/rejected/` to reject

```bash
# Approve
mv "/path/to/vault/Plans/pending/abc123-plan.md" "/path/to/vault/Plans/approved/"

# Or reject
mv "/path/to/vault/Plans/pending/abc123-plan.md" "/path/to/vault/Plans/rejected/"
```

After approval:
```
[Task:abc123] Approval detected
[Task:abc123] APPROVE → ACT
[Task:abc123] Executing plan steps...
[Task:abc123] ACT → LOG
[Task:abc123] LOG → CLOSE
[Task:abc123] Complete. Moved to /Done
```

### Viewing Audit Logs

Open today's log file in Obsidian:
```
/Logs/2026-01-17.log.md
```

### Handling Errors

Errors appear in `/Needs_Action` as `ERROR_*.md` files:

```markdown
---
error_type: TaskProcessingError
task_id: abc123
severity: high
resolution_status: open
---

# Error: Task Processing Failed

## Suggested Options
1. Retry the task
2. Mark as failed
3. Escalate to admin
```

To resolve:
1. Read the error file
2. Take appropriate action
3. Move file to `/Done` when resolved

## Verification Checklist

- [ ] Vault directories created
- [ ] Task file appears in `/Needs_Action`
- [ ] Task transitions through states
- [ ] Plan created in `/Plans`
- [ ] Approval workflow works (file movement detected)
- [ ] Audit log entries appear in `/Logs`
- [ ] Completed task moved to `/Done`

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run start` | Start cognitive loop (foreground) |
| `npm run start:pm2` | Start with PM2 (background) |
| `npm run stop` | Stop PM2 process |
| `npm run vault:init` | Initialize/verify vault structure |
| `npm run vault:status` | Show vault health |
| `npm run logs` | View PM2 logs |
| `npm run test` | Run test suite |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_PATH` | Yes | - | Path to Obsidian vault |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `APPROVAL_POLL_MS` | No | `1000` | Approval check interval |
| `GRACEFUL_SHUTDOWN_MS` | No | `30000` | Shutdown timeout |

## Troubleshooting

### Task stuck in WATCH state
- Check file permissions on `/Needs_Action`
- Verify file has valid YAML frontmatter
- Check logs for parsing errors

### Approval not detected
- Ensure file is moved, not copied
- Check that target directory exists
- Verify polling interval in config

### Audit log not updating
- Check write permissions on `/Logs`
- Verify disk space available
- Check for file locking issues
