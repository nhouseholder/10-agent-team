# PLAN — Memory System Efficiency Fix

**Date:** 2026-04-22
**Version:** v1.7.0 → v1.7.1
**Scope:** 5 items — sync fix, mempalace write path, retrieval order, evidence budget, trust-summaries rule
**Estimated effort:** ~45 min for @generalist
**Files affected:** 13 source files + 8 live system files

---

## Phase 0: Safety — Backup Live System

**File:** `~/.claude/agents/`

### Step 0.1: Create backup
```bash
cp -r ~/.claude/agents ~/.claude/agents.backup.20260422
```

### Step 0.2: Verify backup
```bash
ls -la ~/.claude/agents.backup.20260422/
# Should show all gsd-*.md files
```

**Stop if:** Backup fails. Do not proceed without a working backup.

---

## Phase 1: Update `_shared/memory-systems.md` (Source of Truth)

**File:** `~/ProjectsHQ/8-agent-team/_shared/memory-systems.md`

### Step 1.1: Update mempalace description (line ~12)

**Find:**
```markdown
2. **mempalace** — READ-ONLY semantic search. Verbatim content storage with wings, rooms, and drawers.
    - Use `mempalace_mempalace_search` for semantic search across all stored content
    - Use `mempalace_mempalace_list_wings` and `mempalace_mempalace_list_rooms` to explore structure
    - Use `mempalace_mempalace_traverse` to follow cross-wing connections between related topics
    - Use `mempalace_mempalace_kg_query` for knowledge graph queries about entities and relationships
   - **Do NOT write to mempalace during normal save rhythm.** The checkpoint file on disk serves the human-readable verbatim fallback. Mempalace is for search only.
```

**Replace with:**
```markdown
2. **mempalace** — Semantic search + verbatim storage. Wings, rooms, and drawers for content that benefits from semantic retrieval.
    - Use `mempalace_mempalace_search` for semantic search across all stored content
    - Use `mempalace_mempalace_list_wings` and `mempalace_mempalace_list_rooms` to explore structure
    - Use `mempalace_mempalace_traverse` to follow cross-wing connections between related topics
    - Use `mempalace_mempalace_kg_query` for knowledge graph queries about entities and relationships
    - Use `mempalace_mempalace_add_drawer` to save verbatim content for semantic search (see Mempalace Write Path below)
```

### Step 1.2: Update RULES section (line ~24)

**Find:**
```markdown
- Mempalace is READ-ONLY — do not write to it during normal save rhythm
```

**Replace with:**
```markdown
- Mempalace is a secondary write target — write verbatim content that benefits from semantic search (see Mempalace Write Path below)
```

### Step 1.3: Update Retrieval Order (line ~35)

**Find:**
```markdown
## Retrieval Order (MANDATORY)

Use the memory systems in this order unless the task explicitly needs something else:

1. **Project and task framing** — determine project, subsystem, and question first
2. **`brain-router_brain_query`** — fastest broad lookup across structured memory and conversation history
3. **`engram_mem_search`** — decisions, bugfixes, patterns, and chronological session history
4. **`engram_mem_timeline`** — when sequence matters more than isolated facts
5. **`mempalace_mempalace_search`** — semantic or verbatim recall only when needed
```

**Replace with:**
```markdown
## Retrieval Order (MANDATORY)

Use the memory systems in this order unless the task explicitly needs something else:

1. **Project and task framing** — determine project, subsystem, and question first
2. **`brain-router_brain_query`** — fastest broad lookup across structured memory and conversation history
3. **`mempalace_mempalace_search`** — semantic/verbatim recall. One call can surface relevant content without individual observation fetches.
4. **`engram_mem_search`** or **`engram_mem_context`** — structured observations, decisions, bugfixes, patterns
5. **`engram_mem_timeline`** — when sequence matters more than isolated facts

**Why mempalace before engram:** Mempalace semantic search is a single call that returns verbatim content. If it answers the question, no need to fetch individual engram observations. Engram summaries should be tried only after mempalace.
```

### Step 1.4: Update Retrieval Budget & Circuit Breaker (line ~45)

**Find:**
```markdown
## Retrieval Budget & Circuit Breaker (MANDATORY)

**Hard limit: Max 3 memory tool calls per routing decision.**

| Call # | Tool | Purpose | Stop Condition |
|---|---|---|---|
| 1 | `brain-router_brain_query` | Fast broad lookup | If result answers the question → STOP |
| 2 | `engram_mem_search` or `engram_mem_context` | Structured observations / recent context | If summaries contain the answer → READ THEM, STOP |
| 3 | `engram_mem_get_observation` (max 1–2 IDs) | Full content only if summary is insufficient | If still unclear → proceed with available info, STOP |

**Rules:**
- **Summaries are sufficient.** `engram_mem_context` returns observation summaries. Read them. Do NOT fetch full content for every ID.
- **One get_observation max.** If you need full content, fetch at most 1–2 observations. Never fetch 3+.
- **Search returned nothing?** Proceed with available info. Do not expand search with broader queries.
- **Circuit breaker:** After 3 calls, budget is exhausted. Proceed with whatever you have. Do not make additional memory calls for the same routing decision.
- **No retry loops.** If a memory call fails or returns empty, that counts toward the 3-call budget. Move on.
```

**Replace with:**
```markdown
## Retrieval Budget & Circuit Breaker (MANDATORY)

**Hard limit: Max 3 memory tool calls per routing decision.**

| Call # | Tool | Purpose | Stop Condition |
|---|---|---|---|
| 1 | `brain-router_brain_query` | Fast broad lookup | If result answers the question → STOP |
| 2 | `mempalace_mempalace_search` | Semantic/verbatim recall | If result contains the answer → READ IT, STOP |
| 3 | `engram_mem_search` or `engram_mem_context` | Structured observations / recent context | If summaries contain the answer → READ THEM, STOP. If not, proceed with available info. |

**Rules:**
- **No get_observation in the budget.** `engram_mem_get_observation` is NOT part of the 3-call limit. It was the escape hatch that caused 40-call loops. If summaries are insufficient after 3 calls, proceed with available info.
- **Search returned nothing?** Proceed with available info. Do not expand search with broader queries.
- **Circuit breaker:** After 3 calls, budget is exhausted. Proceed with whatever you have. Do not make additional memory calls for the same routing decision.
- **No retry loops.** If a memory call fails or returns empty, that counts toward the 3-call budget. Move on.
```

### Step 1.5: Add Trust Summaries Rule (after Retrieval Budget section)

**Insert after the Retrieval Budget section:**
```markdown
## Trust Summaries Rule (MANDATORY)

`engram_mem_context` and `engram_mem_search` return **summaries**, not full content.

**Read the summaries. Stop there.**

- If the summary answers your question → STOP. Do NOT fetch the full observation.
- If the summary is unclear but you have enough context to proceed → STOP.
- Only fetch full content via `engram_mem_get_observation` if:
  - The summary explicitly references a specific file path or code snippet you need
  - The summary contains a decision or bugfix where the exact rationale matters
  - AND you have not already exhausted your 3-call retrieval budget

**Anti-pattern:** Fetching full observations for every search result "just to be thorough." This is what caused the 40-call loop. Summaries are designed to be sufficient. Trust them.
```

### Step 1.6: Add Mempalace Write Path section (after Trust Summaries)

**Insert after Trust Summaries:**
```markdown
## Mempalace Write Path (MANDATORY)

Mempalace is a **secondary write target** for verbatim content that benefits from semantic search. It does NOT replace engram for structured observations.

### When to Write to Mempalace

| Content Type | Write to Mempalace? | Wing | Room | Why |
|---|---|---|---|---|
| Session summaries (C3) | YES | project name | session-summaries | Large verbatim text, semantic search valuable |
| Research findings / raw sources | YES | project name | research | Verbatim content, semantic search valuable |
| Error logs / debugging traces | YES | project name | errors | Verbatim content, pattern matching valuable |
| Code snippets / examples | YES | project name | code-snippets | Verbatim content, semantic search valuable |
| Pre-compaction checkpoints (C1) | NO | — | — | Already saved to disk + engram |
| Post-delegation findings (C2) | NO | — | — | Short structured observation; engram is sufficient |
| Decision rationales | NO | — | — | Structured gist; engram is sufficient |
| Bugfix patterns | NO | — | — | Structured gist; engram is sufficient |

### How to Write

Use `mempalace_mempalace_add_drawer`:
- `wing`: project name (e.g., "mmalogic", "diamondpredictions")
- `room`: content type from table above
- `content`: verbatim text (never summarized)

### Rate Limit

Max 1 mempalace write per checkpoint trigger. C1 and C2 do NOT write to mempalace. Only C3 (session-end summary) and explicit research/error logging should write.
```

---

## Phase 2: Update `_shared/cognitive-kernel.md`

**File:** `~/ProjectsHQ/8-agent-team/_shared/cognitive-kernel.md`

### Step 2.1: Update evidence pull definition (line ~76)

**Find:**
```markdown
**Definition of "evidence pull":** One tool call that returns new information: `read`, `grep`, `glob`, `brain-router_brain_query`, `engram_mem_search`, `mempalace_mempalace_search`, `webfetch`. Re-reading a previously read file does NOT count as a new pull.
```

**Replace with:**
```markdown
**Definition of "evidence pull":** One tool call that returns new information: `read`, `grep`, `glob`, `brain-router_brain_query`, `engram_mem_search`, `mempalace_mempalace_search`, `webfetch`. Re-reading a previously read file does NOT count as a new pull.

**Memory calls count.** The 3-call retrieval budget in `_shared/memory-systems.md` is a SUBSET of the evidence budget. Memory preflight calls (brain_query, mempalace_search, mem_search) consume evidence pulls. A FAST-mode agent that uses `brain-router_brain_query` has used its 0-pull budget and must proceed. A DELIBERATE-mode agent that uses `brain-router_brain_query` + `mempalace_mempalace_search` has used 2 pulls and has 1 remaining.
```

---

## Phase 3: Update `agents/orchestrator.md`

**File:** `~/ProjectsHQ/8-agent-team/agents/orchestrator.md`

### Step 3.1: Update Memory Retrieval Protocol section (line ~79)

**Find:**
```markdown
**Memory lookup priority (retrieval budget: max 3 calls):**
1. `brain-router_brain_query` — first attempt, auto-routes to the right store. **If answer is present → STOP.**
2. `engram_mem_search` or `engram_mem_context` — if structured observations needed. **If summaries contain the answer → READ THEM, STOP. Do NOT fetch full content for every ID.**
3. `engram_mem_get_observation` (max 1–2 IDs) — only if summary is insufficient. **If still unclear → proceed with available info, STOP.**

**Retrieval budget exhausted after 3 calls.** Never make additional memory calls for the same routing decision. If search returns nothing, proceed with available info — do not expand search.
```

**Replace with:**
```markdown
**Memory lookup priority (retrieval budget: max 3 calls):**
1. `brain-router_brain_query` — first attempt, auto-routes to the right store. **If answer is present → STOP.**
2. `mempalace_mempalace_search` — semantic/verbatim recall. **If result contains the answer → READ IT, STOP.**
3. `engram_mem_search` or `engram_mem_context` — structured observations. **If summaries contain the answer → READ THEM, STOP. Do NOT fetch full content for every ID.**

**Retrieval budget exhausted after 3 calls.** Never make additional memory calls for the same routing decision. If search returns nothing, proceed with available info — do not expand search. `engram_mem_get_observation` is NOT part of the budget; if summaries are insufficient, proceed without it.
```

---

## Phase 4: Regenerate All Prompts

**Command:**
```bash
cd ~/ProjectsHQ/8-agent-team
node scripts/compose-prompts.js
```

**Verify:**
```bash
node scripts/validate-agents.js
```

**Stop if:** Validation fails. Fix source files, re-run.

---

## Phase 5: Sync to Live System

**Target:** `~/.claude/agents/`

### Step 5.1: Identify memory sections in live files

Each live file (`gsd-*.md`) contains a memory section. Find it with:
```bash
grep -n -A 20 "Memory\|memory\|engram\|mempalace" ~/.claude/agents/gsd-executor.md
```

### Step 5.2: Patch each live file

For each live file, find the memory retrieval section and add the retrieval budget table + trust summaries rule. The exact location varies per file, but the pattern is:

1. Find the section that mentions `engram_mem_search`, `brain-router_brain_query`, or memory lookup order
2. Insert the following BEFORE the existing memory lookup list:

```markdown
**Retrieval budget: max 3 memory tool calls per routing decision.**

| Call # | Tool | Purpose | Stop Condition |
|---|---|---|---|
| 1 | `brain-router_brain_query` | Fast broad lookup | If result answers the question → STOP |
| 2 | `mempalace_mempalace_search` | Semantic/verbatim recall | If result contains the answer → READ IT, STOP |
| 3 | `engram_mem_search` or `engram_mem_context` | Structured observations | If summaries contain the answer → READ THEM, STOP |

**Trust Summaries Rule:** `engram_mem_context` and `engram_mem_search` return summaries, not full content. Read the summaries. Stop there. Do NOT fetch full observations for every ID. If summaries are insufficient after 3 calls, proceed with available info.

**Circuit breaker:** After 3 calls, budget is exhausted. Proceed with whatever you have. Do not make additional memory calls for the same routing decision.
```

### Step 5.3: Files to patch

| File | Agent Role | Memory Section Location |
|---|---|---|
| `gsd-executor.md` | Orchestrator/Generalist | Search for "Memory Retrieval" or "memory lookup" |
| `gsd-planner.md` | Strategist | Search for "Memory Preflight" or "memory systems" |
| `gsd-debugger.md` | Auditor | Search for "Memory" or "engram" |
| `gsd-codebase-mapper.md` | Explorer | Search for "Memory" or "context" |
| `gsd-research-synthesizer.md` | Researcher | Search for "Memory" or "research" |
| `gsd-ui-checker.md` | Designer | Search for "Memory" or "context" |
| `gsd-verifier.md` | Generalist | Search for "Memory" or "verification" |
| `gsd-nyquist-auditor.md` | Council | Search for "Memory" or "arbitration" |

### Step 5.4: Verify live patches

```bash
grep -c "Retrieval budget" ~/.claude/agents/gsd-*.md
# Should return 8 (one per file)

grep -c "Trust Summaries" ~/.claude/agents/gsd-*.md
# Should return 8 (one per file)
```

---

## Phase 6: Commit and Tag

### Step 6.1: Commit repo changes
```bash
cd ~/ProjectsHQ/8-agent-team
git add -A
git commit -m "fix(memory): retrieval budget, mempalace writes, trust summaries

- Mempalace is now a secondary write target (not read-only)
- Retrieval order: mempalace before engram (semantic search first)
- Evidence budget explicitly includes memory calls
- Trust Summaries Rule: read summaries, stop there
- get_observation removed from 3-call budget
- Synced to live system"
```

### Step 6.2: Tag
```bash
git tag v1.7.1
```

### Step 6.3: Push
```bash
git push origin main --tags
```

---

## Verification Checklist

- [ ] Backup created at `~/.claude/agents.backup.20260422`
- [ ] `_shared/memory-systems.md` updated with all 5 changes
- [ ] `_shared/cognitive-kernel.md` evidence pull definition updated
- [ ] `agents/orchestrator.md` memory retrieval protocol updated
- [ ] `node scripts/compose-prompts.js` runs without errors
- [ ] `node scripts/validate-agents.js` passes
- [ ] All 8 live system files patched with retrieval budget + trust summaries
- [ ] `grep -c "Retrieval budget" ~/.claude/agents/gsd-*.md` returns 8
- [ ] `grep -c "Trust Summaries" ~/.claude/agents/gsd-*.md` returns 8
- [ ] Changes committed and tagged v1.7.1

---

## Rollback Plan

If anything breaks:

1. **Restore live system:**
   ```bash
   rm -rf ~/.claude/agents
   cp -r ~/.claude/agents.backup.20260422 ~/.claude/agents
   ```

2. **Revert repo:**
   ```bash
   cd ~/ProjectsHQ/8-agent-team
   git reset --hard HEAD~1
   git tag -d v1.7.1
   ```
