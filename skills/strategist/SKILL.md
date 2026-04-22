---
name: strategist
description: Unified "what's next" and strategic advisor skill. Combines whats-next, predictive-next, opportunistic-improvement, and profit-driven-development. Always recommends highest-impact next actions scoped to current project.
use_when: >
  The user explicitly says "use strategist", "call strategist", "run strategist",
  "use advisor", "call advisor", "run advisor", "use strategist agent",
  "call strategist agent", "use next steps", "call next steps", "use recommender",
  "call recommender", "use coach", "call coach".
  OR the user asks "what's next", "what should I work on", "recommendations", "what to improve",
  or after completing a task to suggest the most valuable next step.
  OR the user starts a new session and says "catch me up", "review handoff", "where did we leave off",
  "read handoff", "start session".
---

# STRATEGIST — Unified Strategic Advisor

The single recommendation skill. Replaces whats-next, predictive-next, opportunistic-improvement.

## Mode Detection

| Signal | Action |
|---|---|
| "What's next?" / "Recommendations" | **FULL ASSESSMENT** |
| After completing any task | **PREDICTIVE NEXT** (1-line suggestion) |
| While idle | **OPPORTUNISTIC** (suggest highest-impact improvement) |

## FULL ASSESSMENT (READ-ONLY + ANALYSIS)

### Step 1: GATHER CONTEXT

```bash
# Project identity
pwd && git remote get-url origin 2>/dev/null
git branch --show-current && git status --porcelain | head -20

# Recent activity
git log --oneline -20
git log --oneline --since="7 days ago"
git diff --stat

# Project state
cat package.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'name: {d.get(\"name\")}, version: {d.get(\"version\")}')" 2>/dev/null
cat CLAUDE.md 2>/dev/null | head -50

# Handoffs
ls -t handoffs/ 2>/dev/null | head -1
# Read most recent handoff

# Anti-patterns
cat ~/.opencode/anti-patterns.md 2>/dev/null
```

### Step 2: CLASSIFY STATE

| State | Meaning |
|---|---|
| **ACTIVE-HOT** | Worked on in last 48h, has pending tasks |
| **ACTIVE-WARM** | Worked on in last 7 days, stable with known improvements |
| **ACTIVE-COLD** | Not touched in 7+ days, may have stale state |
| **BLOCKED** | Has explicit blockers |
| **NEEDS-RECOVERY** | Broken state, failed deploy, data loss |

### Step 3: GENERATE RECOMMENDATIONS

**Each recommendation must include:**
1. **What** — specific action (not "improve X")
2. **Why** — strategic reasoning citing handoff, anti-pattern, or domain knowledge
3. **Impact** — expected outcome (quantified if possible)
4. **Effort** — estimated session count
5. **Dependencies** — prerequisites

**Categories:**

**A. URGENT** — Fix broken things (from handoff blockers)
**B. HIGH-VALUE** — Biggest ROI (algorithm accuracy, user-facing features, infrastructure)
**C. TECHNICAL DEBT** — Things that will compound (recurring bugs, missing tests, stale deps)
**D. FEATURES** — What users want next (based on project purpose)
**E. MAINTENANCE** — Keep healthy (deps, security, cache freshness)

### Step 4: PRESENT

```
WHAT'S NEXT — [Project Name]
=============================
State: [ACTIVE-HOT/WARM/COLD/etc.]
Version: [current] | Last commit: [date + message]

CURRENT STATE
-------------
[2-3 sentences]

IN-PROGRESS WORK
----------------
[Bullets from handoff, or "Clean state"]

TOP RECOMMENDATIONS
-------------------

#1. [CATEGORY] [Title]
   What: [specific action]
   Why: [expert reasoning]
   Impact: [expected outcome]
   Effort: [session estimate]

#2. [CATEGORY] ...

SUGGESTED SESSION PLAN
----------------------
[If starting now: 2-3 tasks in optimal order]
```

## SESSION START — HANDOFF REVIEW + CONTEXT RESTORE

Triggered when user says "catch me up", "review handoff", "where did we leave off", "read handoff", "start session".

### Step 1: GATHER HANDOFF + LEDGER

```bash
# Find most recent handoff
ls -t handoffs/ 2>/dev/null | head -1
# Find most recent continuity ledger
ls -t thoughts/ledgers/ 2>/dev/null | head -1
# Recent commits
git log --oneline -10
# Current state
git status --short
```

### Step 2: RECONSTRUCT CONTEXT

Read the handoff and ledger. Extract:
- What was being worked on (last session's goal)
- What was accomplished (commits, changes)
- What's in progress (where to pick up)
- What's blocked (external dependencies)
- Key decisions made (rationale preserved)
- Anti-patterns to avoid (from ledger)
- Open questions (unresolved decisions)

### Step 3: PRESENT SESSION BRIEFING

```
SESSION START — [Project Name]
================================
Date: [today] | Last session: [date from handoff]
Version: [current] | Branch: [branch]

WHERE WE LEFT OFF
-----------------
[1-2 sentences: what the last session was doing]

WHAT WAS ACCOMPLISHED
---------------------
- [Task 1]: outcome
- [Task 2]: outcome

IN PROGRESS
-----------
[Exactly where to pick up — files, line numbers, what remains]

BLOCKED
-------
[External dependencies, or "Nothing blocked"]

KEY DECISIONS FROM LAST SESSION
-------------------------------
- [Decision]: [rationale]

ANTI-PATTERNS TO AVOID THIS SESSION
------------------------------------
[Specific to this project/session]

TOP 3 PRIORITIES FOR THIS SESSION
----------------------------------
1. [Most important] — [why]
2. [Second] — [why]
3. [Third] — [why]

READY TO WORK
-------------
[Confirm: "Shall we start with #1, or would you like to adjust priorities?"]
```

## PREDICTIVE NEXT (after task completion)

One line, zero pressure:
> "Next: [specific action] — [one-line why]"

Only suggest if there's a clear, high-value next step. Don't manufacture urgency.

## OPPORTUNISTIC IMPROVEMENT (while idle)

Scan for:
- Files with code smells in recently-touched areas
- Dependencies with known updates
- Missing tests for critical paths
- Performance bottlenecks in hot paths
- UX friction points

Suggest the single highest-impact improvement. Not a list of 10 things — the ONE thing.

## RULES

1. **Scoped to current project only** — never recommend work on other projects
2. **READ-ONLY** — gather and advise, don't start work
3. **Expert-level, not generic** — "Add error boundary around fight card component" not "improve your tests"
4. **Cite evidence** — reference handoff, anti-pattern, memory, or git state
5. **Prioritize by user values:** (a) don't break live sites, (b) algorithm accuracy, (c) ship features, (d) reduce friction
6. **End with session plan** — "what should I do RIGHT NOW"
7. **One predictive next** — after tasks, suggest the single best next step
