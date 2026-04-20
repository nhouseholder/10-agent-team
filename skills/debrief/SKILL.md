---
name: debrief
description: Unified summarization, progress reporting, and session wrap skill. Combines response-recap, progress-tracker, and /simplify-changes. Triggers on "summarize", "what did we do", "progress report", "debrief", "wrap up", "simplify changes".
use_when: >
  The user explicitly says "use debrief", "call debrief", "run debrief",
  "use summarizer", "call summarizer", "run summarizer", "use summary",
  "call summary", "use reporter", "call reporter", "use progress tracker",
  "call progress tracker".
  OR the user wants a summary of work done, progress report, or session debrief.
  After multi-step work, complex debugging, or long implementation sessions.
---

# DEBRIEF — Unified Summarization & Progress Reporting

The single summary skill. Replaces response-recap, progress-tracker, /simplify-changes.

## Mode Detection

| Signal | Output |
|---|---|
| "What did we do?" | **SESSION SUMMARY** |
| "Progress report" | **PROGRESS TRACKER** |
| "Simplify changes" | **CODE SIMPLIFICATION** |
| "Wrap up" | **SESSION DEBRIEF** |

## SESSION SUMMARY

After complex multi-step work, produce:

```
SESSION SUMMARY
===============
Time: [elapsed] | Files changed: [N] | Commits: [N]

WHAT WAS REQUESTED
------------------
[1-2 sentences: what the user asked for]

WHAT WAS DONE
-------------
- [Task 1]: files changed → outcome
- [Task 2]: files changed → outcome
- [Task 3]: files changed → outcome

WHAT CHANGED (git diff --stat)
------------------------------
[Output of git diff --stat]

CURRENT STATE
-------------
[Where things stand now — working, needs testing, needs review]

NEXT STEP
---------
[The single most important next action]
```

## PROGRESS TRACKER

For multi-task work in progress:

```
PROGRESS — [Feature/Project Name]
==================================
[N]/[M] tasks complete ([X]%)

✅ [Completed task 1]
✅ [Completed task 2]
🔄 [In progress: task 3]
⏳ [Pending: task 4]
⏳ [Pending: task 5]

Elapsed: [time] | ETA: [estimate]
```

## CODE SIMPLIFICATION

When reviewing uncommitted changes for simplification:

```bash
git diff --stat
git diff
```

For each changed file:
1. What does this change do?
2. Is there a simpler way to achieve the same result?
3. Can any code be removed (dead code, redundancy)?
4. Are variable/function names clear?

Propose simplifications that:
- Reduce lines without losing clarity
- Remove redundant logic
- Clarify intent through naming
- Preserve behavior exactly

## RULES

1. **Be specific** — file names, line counts, concrete outcomes
2. **No fluff** — facts only, no philosophical summaries
3. **Include git data** — diff stat, commit count, branch
4. **Always end with next step** — what should happen next
5. **Honest about unknowns** — if something wasn't verified, say so
