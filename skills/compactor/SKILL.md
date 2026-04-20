---
name: compactor
description: Unified context management and session continuity skill. Combines total-recall, strategic-compact, /ledger, and session continuity. Runs in background to preserve critical context across compaction and sessions.
use_when: >
  The user explicitly says "use compactor", "call compactor", "run compactor",
  "use context manager", "call context manager", "use ledger", "call ledger",
  "use state saver", "call state saver", "use memory", "call memory".
  OR context is getting long, session is about to end, user says "compact", "save context",
  "ledger", "remember this", or starting a new session that needs prior context.
---

# COMPACTOR — Unified Context Management

The single context/continuity skill. Replaces total-recall, strategic-compact, /ledger.

## Background Behavior (always active)

### Context Preservation Points
At logical boundaries (after completing a task, before switching topics, after significant code changes):

```bash
# Capture current state
git status --short
git log --oneline -5
pwd
```

Save a compact state snapshot to `thoughts/ledgers/CONTINUITY_$(date +%Y-%m-%d_%H%M).md`:

```markdown
# Continuity Ledger — [Project] — [Date Time]

## Current Task
[What we're working on right now]

## Key Decisions Made
- [Decision 1]: [rationale]
- [Decision 2]: [rationale]

## Critical Context (survives compaction)
- [File paths that matter]
- [Variables/constants that must not change]
- [Patterns/conventions in use]
- [Open questions pending]

## Anti-Patterns to Avoid
- [Specific to this session/project]

## Next Action
[Exactly where to pick up]
```

## Strategic Compaction

When context approaches limits:

1. **Identify what to keep:**
   - Current task and immediate context
   - Key decisions and their rationale
   - File paths and code patterns
   - Open questions and pending work
   - Anti-patterns discovered

2. **Identify what to discard:**
   - Explored-and-rejected approaches
   - Verbose error messages (keep root cause only)
   - Intermediate debugging steps (keep conclusion only)
   - Repetitive tool outputs

3. **Create compact summary:**
   - 10-15 lines max
   - Preserves all decision rationale
   - Preserves all file paths
   - Preserves all open questions

## Session Continuity Protocol

### On Session Start:
```bash
# Find most recent ledger for this project
ls -t thoughts/ledgers/ 2>/dev/null | head -3
# Read project CLAUDE.md, AGENTS.md
# Read recent handoffs
git log --oneline -10
```

### On Session End:
1. Update continuity ledger with current state
2. Commit ledger changes
3. Output: "Ledger saved. Next session will pick up from: [path]"

## Memory Persistence

### Project-Level Memory
Each project maintains:
- `thoughts/ledgers/` — session continuity files
- `handoffs/` — end-of-session summaries
- `docs/superpowers/specs/` — design decisions
- `docs/superpowers/plans/` — implementation plans

### Global Memory
- `~/.claude/anti-patterns.md` — recurring mistakes across all projects
- `~/.claude/projects/*/memory/MEMORY.md` — project-specific long-term memory

## Compaction Rules

1. **Preserve decisions with rationale** — "why" matters more than "what"
2. **Preserve file paths** — implementers need exact locations
3. **Preserve open questions** — unresolved decisions must survive
4. **Discard exploration dead-ends** — what we tried and rejected
5. **Discard verbose outputs** — keep conclusions, not intermediate steps
6. **Ledger before compact** — always save state before context shrinks
7. **Re-inject after compact** — restore critical context from ledger
