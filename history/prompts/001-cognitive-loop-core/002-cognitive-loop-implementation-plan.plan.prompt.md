---
id: 002
title: Cognitive Loop Implementation Plan
stage: plan
date: 2026-01-17
surface: agent
model: claude-opus-4-5-20251101
feature: 001-cognitive-loop-core
branch: 001-cognitive-loop-core
user: Asim
command: /sp.plan
labels: ["plan", "cognitive-loop", "typescript", "xstate", "architecture"]
links:
  spec: specs/001-cognitive-loop-core/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-cognitive-loop-core/plan.md
  - specs/001-cognitive-loop-core/research.md
  - specs/001-cognitive-loop-core/data-model.md
  - specs/001-cognitive-loop-core/contracts/cognitive-loop-api.md
  - specs/001-cognitive-loop-core/quickstart.md
tests:
  - N/A (planning phase)
---

## Prompt

/sp.plan (no arguments - used current branch 001-cognitive-loop-core)

User selected TypeScript/Node.js as the implementation language.

## Response snapshot

Created comprehensive implementation plan for Cognitive Loop Core:

**Technical Stack**:
- TypeScript 5.x on Node.js 20 LTS
- XState 5.x for state machine (prevents step skipping)
- chokidar 3.x for file watching
- gray-matter + remark for markdown processing
- pino for logging
- PM2 for process management
- Vitest for testing

**Phase 0 Output (research.md)**:
- 10 technology decisions with rationale
- Dependencies summary table
- Architecture decisions for FSM, approval detection, error format

**Phase 1 Outputs**:
- data-model.md: 4 entities (Task, Plan, AuditEntry, ErrorReport) with full schemas
- contracts/cognitive-loop-api.md: TypeScript interfaces for all modules
- quickstart.md: Setup and usage guide

**Constitution Check**: All 8 articles pass compliance review

**Project Structure**: Single project with modular architecture:
- src/types/ - Type definitions
- src/modules/ - Core modules (vault, task, plan, audit, error, loop)
- src/cli/ - CLI commands
- src/lib/ - Utilities
- tests/ - Unit and integration tests

**ADR Candidates Identified**: XState for FSM, File-Based Approval, Append-Only Audit

## Outcome

- Impact: Complete implementation plan ready for task generation
- Tests: N/A (planning phase)
- Files: 5 artifacts created (plan.md, research.md, data-model.md, contracts/, quickstart.md)
- Next prompts: /sp.tasks to generate implementation tasks
- Reflection: Constitution check integrated into plan ensures compliance from start

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Constitution Check PASS (all 8 articles)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A - initial plan creation
