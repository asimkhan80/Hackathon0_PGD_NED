# Digital FTE Cognitive Loop Core

<div align="center">

```
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║     ██████╗ ██╗ ██████╗ ██╗████████╗ █████╗ ██╗             ║
    ║     ██╔══██╗██║██╔════╝ ██║╚══██╔══╝██╔══██╗██║             ║
    ║     ██║  ██║██║██║  ███╗██║   ██║   ███████║██║             ║
    ║     ██║  ██║██║██║   ██║██║   ██║   ██╔══██║██║             ║
    ║     ██████╔╝██║╚██████╔╝██║   ██║   ██║  ██║███████╗        ║
    ║     ╚═════╝ ╚═╝ ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝        ║
    ║                                                              ║
    ║              ███████╗████████╗███████╗                       ║
    ║              ██╔════╝╚══██╔══╝██╔════╝                       ║
    ║              █████╗     ██║   █████╗                         ║
    ║              ██╔══╝     ██║   ██╔══╝                         ║
    ║              ██║        ██║   ███████╗                       ║
    ║              ╚═╝        ╚═╝   ╚══════╝                       ║
    ║                                                              ║
    ║         🧠 Cognitive Loop Core v0.1.0                        ║
    ║         File-based Autonomous Agent Infrastructure          ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
```

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![XState](https://img.shields.io/badge/XState-5.25-2C3E50?style=for-the-badge&logo=xstate&logoColor=white)](https://xstate.js.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**An intelligent, file-based autonomous agent that processes tasks through an 8-state cognitive loop**

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Demo](#-demo) • [Architecture](#-architecture) • [Commands](#-cli-commands)

</div>

---

## Overview

Digital FTE (Full-Time Employee) Core is a **hackathon project** that implements an autonomous task processing system using a cognitive loop architecture. It watches for task files in an Obsidian-style vault, processes them through 8 distinct cognitive states, and produces audited, logged results.

Think of it as a **digital worker** that:
- Monitors for new tasks
- Plans how to execute them
- Requests human approval when needed
- Executes the plan
- Logs everything for audit

---

## Cognitive Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         🧠 THE COGNITIVE LOOP                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐            │
│    │  WATCH  │────▶│  WRITE  │────▶│  REASON  │────▶│  PLAN   │            │
│    │   👁️    │     │   ✍️    │     │   🤔     │     │   📋    │            │
│    └─────────┘     └─────────┘     └──────────┘     └────┬────┘            │
│         │                                                 │                 │
│         │              8-STATE COGNITIVE LOOP             │                 │
│         │                                                 ▼                 │
│    ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐            │
│    │  CLOSE  │◀────│   LOG   │◀────│   ACT    │◀────│ APPROVE │            │
│    │   ✅    │     │   📝    │     │   ⚡     │     │   ✋    │            │
│    └─────────┘     └─────────┘     └──────────┘     └─────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ STATE       │ DESCRIPTION                                                 │
├─────────────┼─────────────────────────────────────────────────────────────┤
│ 👁️  WATCH   │ Monitor inbox for new task files                           │
│ ✍️  WRITE   │ Parse and validate task frontmatter                        │
│ 🤔 REASON   │ Analyze task, determine requirements                       │
│ 📋 PLAN     │ Generate execution plan with approval detection            │
│ ✋ APPROVE  │ Wait for human approval (if required)                      │
│ ⚡ ACT      │ Execute the plan steps                                      │
│ 📝 LOG      │ Record audit entry with checksums                          │
│ ✅ CLOSE    │ Move to completed folder, update status                    │
└─────────────┴─────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---------|-------------|
| **8-State Cognitive Loop** | Tasks flow through WATCH → WRITE → REASON → PLAN → APPROVE → ACT → LOG → CLOSE |
| **XState v5 State Machine** | Robust, predictable state transitions with event-driven architecture |
| **File-Based Workflow** | Uses markdown files with YAML frontmatter - works with Obsidian |
| **Human-in-the-Loop** | Automatic approval detection for sensitive operations (financial, etc.) |
| **Immutable Audit Trail** | SHA-256 checksums for every audit entry, tamper-evident logging |
| **Real-Time File Watching** | Chokidar-powered file system monitoring |
| **File Locking** | Prevents race conditions with proper-lockfile |
| **PM2 Integration** | Production-ready process management |

---

## Tech Stack

```
┌────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY STACK                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Runtime        │  Node.js 20+                                │
│   Language       │  TypeScript 5.9                             │
│   State Machine  │  XState v5.25                               │
│   CLI Framework  │  Commander.js 12                            │
│   File Watching  │  Chokidar 3.6                               │
│   YAML Parsing   │  Gray-matter 4                              │
│   Logging        │  Pino 9                                     │
│   File Locking   │  proper-lockfile 4                          │
│   Process Mgmt   │  PM2                                        │
│   Testing        │  Vitest 2                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Quick Install

```bash
# Clone the repository
git clone https://github.com/asimkhan80/Hackathon0_PGD_NED.git

# Navigate to project directory
cd Hackathon0_PGD_NED

# Install dependencies
npm install

# Build the project
npm run build
```

### Verify Installation

```bash
# Check TypeScript compilation
npm run typecheck

# Run tests
npm test
```

---

## Quick Start

### Step 1: Initialize the Vault

```bash
# Create vault directory structure
npm run vault:init

# Or with custom path
npm run vault:init -- --path ./my-vault
```

This creates:

```
vault/
├── inbox/          # Drop new tasks here
├── active/         # Tasks being processed
├── plans/
│   ├── pending/    # Plans awaiting approval
│   ├── approved/   # Approved plans
│   └── rejected/   # Rejected plans
├── completed/      # Finished tasks
├── logs/           # Audit logs
└── errors/         # Error reports
```

### Step 2: Start the Cognitive Loop

```bash
# Start in foreground (see logs in terminal)
npm run start -- --foreground

# Or start as daemon with PM2
npm run start:pm2
```

### Step 3: Create a Task

Drop a markdown file in `vault/inbox/`:

```bash
# Example: vault/inbox/test-task.md
```

```markdown
---
id: task-001
title: Process quarterly report
source: manual
priority: high
state: WATCH
created: 2024-01-18T10:00:00Z
---

# Task: Process Quarterly Report

## Description
Analyze and summarize the quarterly financial report.

## Requirements
- [ ] Extract key metrics
- [ ] Calculate growth rates
- [ ] Generate summary
```

### Step 4: Watch It Process

The cognitive loop will automatically:
1. Detect the new file (WATCH)
2. Parse and validate (WRITE)
3. Analyze requirements (REASON)
4. Generate a plan (PLAN)
5. Wait for approval if needed (APPROVE)
6. Execute the plan (ACT)
7. Log the audit trail (LOG)
8. Move to completed (CLOSE)

---

## Demo

### Full Demo Walkthrough

```bash
# Terminal 1: Start the cognitive loop
npm run start -- --foreground --log-level debug

# Terminal 2: Create a test task
mkdir -p vault/inbox

cat > vault/inbox/demo-task.md << 'EOF'
---
id: demo-001
title: Demo Task - Hello World
source: manual
priority: normal
state: WATCH
created: 2024-01-18T12:00:00Z
---

# Demo Task

This is a demonstration of the cognitive loop.

## Steps
- [ ] Process this task
- [ ] Generate output
EOF

# Watch Terminal 1 for processing logs!
```

### Check Status

```bash
# View vault status
npm run vault:status

# Detailed statistics
npm run vault:status -- --detailed

# JSON output
npm run vault:status -- --json
```

### Financial Task (Requires Approval)

```bash
cat > vault/inbox/financial-task.md << 'EOF'
---
id: fin-001
title: Process $5000 payment
source: finance
priority: urgent
state: WATCH
created: 2024-01-18T12:00:00Z
---

# Financial Task

Process payment of $5000 to vendor.

## Details
- Amount: $5000
- Vendor: ACME Corp
EOF
```

This task will pause at APPROVE state until you move the plan from `vault/plans/pending/` to `vault/plans/approved/`.

---

## CLI Commands

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLI COMMANDS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  digital-fte init [options]                                             │
│  ├── -p, --path <path>    Vault path (overrides VAULT_PATH env)        │
│  └── -q, --quiet          Minimal output                                │
│                                                                         │
│  digital-fte status [options]                                           │
│  ├── -p, --path <path>    Vault path                                   │
│  ├── -d, --detailed       Show detailed statistics                     │
│  └── -j, --json           Output as JSON                                │
│                                                                         │
│  digital-fte start [options]                                            │
│  ├── -p, --path <path>    Vault path                                   │
│  ├── -l, --log-level      Log level (debug, info, warn, error)         │
│  └── -f, --foreground     Run in foreground                            │
│                                                                         │
│  digital-fte stop [options]                                             │
│  ├── -f, --force          Force stop (no graceful shutdown)            │
│  └── -n, --name <name>    PM2 process name                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Start cognitive loop (tsx) |
| `npm run start:pm2` | Start as PM2 daemon |
| `npm run stop` | Stop PM2 daemon |
| `npm run vault:init` | Initialize vault structure |
| `npm run vault:status` | Show vault status |
| `npm test` | Run tests with Vitest |
| `npm run typecheck` | TypeScript type checking |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │   CLI Layer     │  Commander.js commands (init, start, status, stop)    │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │  Cognitive Loop │  XState v5 state machine + Chokidar watcher           │
│  │    Processor    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│     ┌─────┴─────────────────────────────────────────┐                       │
│     │                                               │                       │
│     ▼                                               ▼                       │
│  ┌─────────────────┐                       ┌─────────────────┐              │
│  │  Task Module    │                       │  Plan Module    │              │
│  │  - create       │                       │  - generate     │              │
│  │  - read         │                       │  - validate     │              │
│  │  - transition   │                       │  - approval     │              │
│  │  - complete     │                       │  - update       │              │
│  └────────┬────────┘                       └────────┬────────┘              │
│           │                                         │                       │
│           └──────────────────┬──────────────────────┘                       │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Core Libraries                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │   │
│  │  │ markdown │ │ filelock │ │ checksum │ │  errors  │ │  config   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Vault (File System)                           │   │
│  │  inbox/ │ active/ │ plans/ │ completed/ │ logs/ │ errors/           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── cli/
│   ├── index.ts              # CLI entry point
│   └── commands/
│       ├── init.ts           # vault:init command
│       ├── start.ts          # start command
│       ├── status.ts         # status command
│       └── stop.ts           # stop command
├── config.ts                 # Configuration loader
├── lib/
│   ├── checksum.ts           # SHA-256 checksums
│   ├── errors.ts             # Custom error classes
│   ├── filelock.ts           # File locking utilities
│   └── markdown.ts           # Frontmatter parsing
├── modules/
│   ├── audit/
│   │   ├── log.ts            # Audit logging
│   │   ├── query.ts          # Query audit entries
│   │   └── verify.ts         # Verify audit integrity
│   ├── error/
│   │   └── report.ts         # Error reporting
│   ├── loop/
│   │   ├── index.ts          # Loop exports
│   │   ├── machine.ts        # XState state machine
│   │   ├── processor.ts      # Task processor
│   │   └── watcher.ts        # File watcher
│   ├── plan/
│   │   ├── approval.ts       # Approval workflow
│   │   ├── generate.ts       # Plan generation
│   │   ├── read.ts           # Plan reading
│   │   ├── update.ts         # Plan updating
│   │   └── validate.ts       # Plan validation
│   ├── task/
│   │   ├── approval.ts       # Task approval
│   │   ├── complete.ts       # Task completion
│   │   ├── create.ts         # Task creation
│   │   ├── read.ts           # Task reading
│   │   └── transition.ts     # State transitions
│   └── vault/
│       ├── init.ts           # Vault initialization
│       ├── status.ts         # Vault status
│       └── verify.ts         # Vault verification
└── types/
    ├── audit.ts              # Audit types
    ├── config.ts             # Config types
    ├── enums.ts              # Enums (TaskState, etc.)
    ├── error.ts              # Error types
    ├── plan.ts               # Plan types
    └── task.ts               # Task types
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VAULT_PATH` | Path to vault directory | `./vault` |
| `LOG_LEVEL` | Logging level | `info` |
| `WATCH_INTERVAL` | File watch interval (ms) | `1000` |

### Example .env

```bash
VAULT_PATH=./vault
LOG_LEVEL=debug
WATCH_INTERVAL=500
```

---

## Task File Format

Tasks use YAML frontmatter in markdown files:

```markdown
---
id: unique-task-id
title: Task Title
source: manual | gmail | whatsapp | filesystem | finance
priority: low | normal | high | urgent
state: WATCH
created: 2024-01-18T12:00:00Z
updated: 2024-01-18T12:00:00Z
tags:
  - tag1
  - tag2
---

# Task Content

Description and details go here.

## Checklist
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
```

---

## Approval Workflow

Tasks containing sensitive keywords automatically require human approval:

### Trigger Keywords
- `$` (currency)
- `payment`, `transfer`, `invoice`
- `budget`, `financial`
- `delete`, `remove`
- `admin`, `root`, `sudo`

### Approval Process

1. Task reaches PLAN state
2. System detects approval keywords
3. Plan saved to `vault/plans/pending/`
4. System waits at APPROVE state
5. Human moves file to `vault/plans/approved/` or `vault/plans/rejected/`
6. System continues (ACT) or fails (reject)

---

## Testing

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

---

## Development

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Run directly with tsx (no build needed)
npx tsx src/cli/index.ts status
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built for **PGD NED Hackathon 2024**
- Powered by [XState](https://xstate.js.org/) for robust state management
- Uses [Obsidian](https://obsidian.md/)-compatible markdown format

---

<div align="center">

**Made with by Asim Khan**

```
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   "The best way to predict the future is to automate it"    ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
```

</div>
