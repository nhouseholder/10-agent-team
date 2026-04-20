---
name: auditor
description: Unified debugging, auditing, and code review skill. Combines systematic-debugging, pre-debug-check, qa-gate, data-consistency-check, and /review-changes. Triggers on any bug, test failure, audit request, or "what's wrong with".
use_when: >
  The user explicitly says "use auditor", "call auditor", "run auditor",
  "use fixer", "call fixer", "run fixer", "use debugger", "call debugger",
  "use code reviewer", "call code reviewer", "use checker", "call checker".
  OR the user encounters a bug, test failure, unexpected behavior, or asks to audit,
  review, check, or debug anything. Also triggers before any deploy or after
  any significant code change.
---

# AUDITOR — Unified Debugging & Code Review

The single debugging/audit skill. Replaces systematic-debugging, pre-debug-check, qa-gate, data-consistency-check, and /review-changes.

## Mode Detection (Phase 0)

**READ MODE** triggers: "check", "audit", "review", "what's wrong with", "look at", "inspect", "verify"
→ First action: READ existing output/data. Identify errors item-by-item. List what's wrong BEFORE proposing fixes.

**FIX MODE** triggers: "fix", "run", "regenerate", "update", "rebuild"
→ Proceed to Phase 1.

**DEFAULT:** If ambiguous, start in READ MODE.

## Phase 1: ROOT CAUSE INVESTIGATION

**Complete before proposing ANY fix:**

1. **Read Error Messages** — Full stack traces, line numbers, file paths
2. **Reproduce Consistently** — If not reproducible, gather more data
3. **Check Recent Changes** — `git diff`, recent commits, new dependencies, config changes
4. **Trace Data Flow** — Trace backwards from symptom to source. Fix at source, not symptom.
5. **Gather Evidence at Component Boundaries** — Log what enters/exits each component

## Phase 2: PATTERN ANALYSIS

1. Find working examples in the same codebase
2. Read reference implementations COMPLETELY
3. List every difference, however small
4. Identify required dependencies, settings, config

## Phase 3: HYPOTHESIS AND TESTING

1. Form single hypothesis: "I think X is the root cause because Y"
2. Test minimally — smallest change, one variable at a time
3. Verify — worked → Phase 4. Didn't work → new hypothesis. Don't stack fixes.
4. **If 3+ fixes failed: STOP and question the architecture.** Discuss with user.

## Phase 4: IMPLEMENTATION

1. Create failing test case
2. Implement single fix — ONE change at a time
3. Verify — test passes? No regressions? Issue resolved?
4. If fix doesn't work → return to Phase 1 with new information

## QA Tiers (auto-selected by work type)

| Tier | When | Checks |
|---|---|---|
| **Tier 1** | Site updates, config changes | Spot-check, visual verify |
| **Tier 2** | New features, bug fixes | Functional + edge case testing |
| **Tier 3** | New builds, algorithm changes | Comprehensive + backtest + data validation |

## Pre-Deploy Audit Gate (MANDATORY before any deploy)

```bash
# Gate 1: Clean working tree
git status --short

# Gate 2: Version regression check
# Read local version vs live version
# ABORT if local < live

# Gate 3: Lint + test + build
npm run lint && npm test && npm run build
```

**ABORT if any gate fails.**

## Data Consistency Check

For any stats, dashboard, or data display:
- Totals match sum of parts?
- No impossible statistics (profit with 0 wins, negative percentages that should be positive)?
- Per-unit math correct?
- Date ranges consistent across tables?

## Red Flags — STOP and Return to Phase 1

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- Proposing solutions before tracing data flow
- Each fix reveals new problem in different place

## Rules

1. **Root cause before fix** — except obvious typos/missing imports
2. **Read mode before fix mode** — audit before regenerating
3. **One variable at a time** — never stack fixes
4. **3-fix limit** — if 3 fixes fail, question architecture
5. **Test before commit** — failing test case first
6. **QA tier matches work type** — don't over-test configs, don't under-test algos

## Loop Detection (MANDATORY — runs before every diagnostic output)

Before emitting any analysis, diagnosis, or audit finding, answer these 3 questions:

1. **Am I re-analyzing something I already diagnosed?** → If yes: state the existing diagnosis and move to action.
2. **Is my output materially different from the last turn?** → If no: STOP. One-line summary → fix or escalate.
3. **Am I using "investigate further" to avoid making a decision?** → If yes: commit to the best hypothesis and test it.

**Hard limit:** If you've emitted the same core finding 2+ times without new evidence, STOP. Write one sentence summarizing what you know, then either propose a fix or escalate. Do not re-analyze.
