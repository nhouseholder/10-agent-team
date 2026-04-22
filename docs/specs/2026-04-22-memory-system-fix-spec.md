# SPEC — Memory System Efficiency Fix

**Date:** 2026-04-22
**Version:** v1.7.0 → v1.7.1
**Scope:** 5 items — sync fix, mempalace write path, retrieval order, evidence budget, trust-summaries rule
**Files affected:** `agents/_shared/memory-systems.md`, `agents/_shared/cognitive-kernel.md`, `agents/orchestrator.md`, `agents/strategist.md`, `agents/explorer.md`, `agents/auditor.md`, `agents/generalist.md`, `agents/researcher.md`, `agents/designer.md`, `agents/council.md`, `agents/council-advocate-for.md`, `agents/council-advocate-against.md`, `agents/council-judge.md`

---

## 1. Problem Statement

The orchestrator made 40+ engram memory tool calls over 10 minutes because:

1. **No retrieval budget limit existed** in the live system (`~/.claude/agents/`). The fix exists in the `8-agent-team` repo at commit `96769ab` but was never synced to the live system.
2. **Mempalace is read-only** with no write path, so agents never use it. The protocol says "Do NOT write to mempalace during normal save rhythm" — which means mempalace is practically empty and unused.
3. **When engram summaries were insufficient**, the orchestrator fetched 40 individual observations instead of trying 1 mempalace semantic search. The retrieval order puts mempalace last (step 5), after engram timeline (step 4).
4. **Memory tool calls don't count against the cognitive-kernel evidence budget**. The 3-pull budget in cognitive-kernel.md covers `read`, `grep`, `search`, `fetch` — but memory calls are treated as free, creating an escape hatch.
5. **No explicit "trust summaries" rule**. `engram_mem_context` returns summaries, but agents routinely fetch full observations for every ID instead of reading the summaries and stopping.

## 2. Goals

1. **Sync the retrieval budget fix** from `96769ab` into the live system
2. **Enable mempalace writes** for content that benefits from semantic search
3. **Reorder retrieval** so mempalace is tried BEFORE individual engram fetches
4. **Expand the evidence budget** to include memory tool calls
5. **Add an explicit "trust summaries" rule** with stop conditions

## 3. Non-Goals

- Do NOT rebuild mempalace from scratch
- Do NOT change the MCP tool set
- Do NOT add new memory systems
- Do NOT change checkpoint protocols (C1/C2/C3)
- Do NOT change save conventions or topic key shapes

## 4. Detailed Requirements

### 4.1 Sync Fix to Live System (R1)

**What:** The `8-agent-team` repo has commit `96769ab` which adds a "Retrieval Budget & Circuit Breaker" section to `_shared/memory-systems.md` and updates `agents/orchestrator.md`. This commit must be synced to the live `~/.claude/agents/` directory.

**Why the live system is different:** The live `~/.claude/agents/` directory contains `gsd-*` agent files (legacy naming) and does NOT have the `_shared/` directory structure. The live system appears to be a flat directory of agent files, not the composable source/generated structure of the repo.

**How to sync:**
- Option A: Copy the new sections directly into each live agent file that contains memory system instructions
- Option B: Replace the live system entirely with the repo's `agents/generated/` files
- **Decision:** Option A is safer — the live system may have other customizations. We will patch the memory sections in place.

**Files to patch in live system:**
- `~/.claude/agents/gsd-executor.md` (contains orchestrator-like routing)
- `~/.claude/agents/gsd-planner.md` (contains strategist-like planning)
- `~/.claude/agents/gsd-debugger.md` (contains auditor-like debugging)
- `~/.claude/agents/gsd-codebase-mapper.md` (contains explorer-like exploration)
- `~/.claude/agents/gsd-research-synthesizer.md` (contains researcher-like research)
- `~/.claude/agents/gsd-ui-checker.md` (contains designer-like UI checks)
- `~/.claude/agents/gsd-verifier.md` (contains generalist-like verification)
- `~/.claude/agents/gsd-nyquist-auditor.md` (contains council-like arbitration)

### 4.2 Mempalace Write Path (R2)

**Current state:** Mempalace is labeled "READ-ONLY" in `memory-systems.md` line 17: "Do NOT write to mempalace during normal save rhythm."

**New state:** Mempalace is a **secondary write target** for verbatim content that benefits from semantic search.

**When to write to mempalace:**

| Content Type | Write to Mempalace? | Why |
|---|---|---|
| Session summaries (C3) | YES | Large verbatim text, benefits from semantic search |
| Pre-compaction checkpoints (C1) | NO | Already saved to disk + engram; duplicate |
| Post-delegation findings (C2) | NO | Short structured observation; engram is sufficient |
| Research findings / raw sources | YES | Verbatim content, semantic search valuable |
| Error logs / debugging traces | YES | Verbatim content, pattern matching valuable |
| Code snippets / examples | YES | Verbatim content, semantic search valuable |
| Decision rationales | NO | Structured gist; engram is sufficient |
| Bugfix patterns | NO | Structured gist; engram is sufficient |

**How to write:** Use `mempalace_mempalace_add_drawer` with:
- `wing`: project name (e.g., "mmalogic", "diamondpredictions")
- `room`: content type (e.g., "session-summaries", "research", "errors", "code-snippets")
- `content`: verbatim text (never summarized)

**Rate limit:** Max 1 mempalace write per checkpoint trigger. C1 and C2 should NOT write to mempalace. Only C3 (session-end summary) and explicit research/error logging should write.

### 4.3 Retrieval Order Fix (R3)

**Current order (from `memory-systems.md`):**
1. Project and task framing
2. `brain-router_brain_query`
3. `engram_mem_search`
4. `engram_mem_timeline`
5. `mempalace_mempalace_search`

**New order:**
1. Project and task framing
2. `brain-router_brain_query` — fastest broad lookup
3. `mempalace_mempalace_search` — semantic/verbatim recall (NOW before engram)
4. `engram_mem_search` or `engram_mem_context` — structured observations
5. `engram_mem_timeline` — when sequence matters

**Rationale:** Mempalace semantic search is a single call that can surface relevant verbatim content. If it answers the question, no need to fetch individual engram observations. The old order forced agents to try engram first (which returns IDs/summaries), then fetch individual observations, then try mempalace as a last resort.

**Updated retrieval budget table:**

| Call # | Tool | Purpose | Stop Condition |
|---|---|---|---|
| 1 | `brain-router_brain_query` | Fast broad lookup | If result answers the question → STOP |
| 2 | `mempalace_mempalace_search` | Semantic/verbatim recall | If result contains the answer → READ IT, STOP |
| 3 | `engram_mem_search` or `engram_mem_context` | Structured observations / recent context | If summaries contain the answer → READ THEM, STOP |

**Note:** `engram_mem_get_observation` is REMOVED from the 3-call budget. It was the escape hatch that caused the 40-call loop. If summaries are insufficient after 3 calls, proceed with available info.

### 4.4 Evidence Budget Expansion (R4)

**Current state (from `cognitive-kernel.md` §5, §6, §7):**
- FAST: 0 additional pulls
- DELIBERATE: 1 pull maximum
- SLOW: anchor + 3 additional pulls maximum

**Definition of "evidence pull" (current):** "One tool call that returns new information: `read`, `grep`, `glob`, `brain-router_brain_query`, `engram_mem_search`, `mempalace_mempalace_search`, `webfetch`."

**Problem:** Memory calls (`brain-router_brain_query`, `engram_mem_search`, `mempalace_mempalace_search`) are already in the list but agents treat them as "free" because they're categorized as "memory preflight" rather than "evidence gathering."

**Fix:** Update the definition to explicitly state that memory calls count toward the budget, and add a cross-reference to the retrieval budget in `memory-systems.md`.

**New definition:**
```
**Definition of "evidence pull":** One tool call that returns new information: `read`, `grep`, `glob`, `brain-router_brain_query`, `engram_mem_search`, `mempalace_mempalace_search`, `webfetch`. 

**Memory calls count.** The 3-call retrieval budget in `_shared/memory-systems.md` is a SUBSET of the evidence budget. Memory preflight calls (brain_query, mem_search, mempalace_search) consume evidence pulls. See `memory-systems.md` §Retrieval Budget for the hard limit.
```

### 4.5 "Trust Summaries" Rule (R5)

**Current state:** The retrieval budget section says "Summaries are sufficient" but this is buried in a table row.

**New state:** A standalone, prominent rule in `memory-systems.md`:

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

## 5. Files to Modify

### In `8-agent-team` repo (source of truth):

| File | Changes |
|---|---|
| `_shared/memory-systems.md` | Add mempalace write path, update retrieval order, add trust summaries rule, update retrieval budget table |
| `_shared/cognitive-kernel.md` | Update evidence pull definition to include memory calls |
| `agents/orchestrator.md` | Update memory retrieval protocol section |
| `agents/strategist.md` | Update memory preflight section |
| `agents/explorer.md` | Update memory preflight section |
| `agents/auditor.md` | Update memory preflight section |
| `agents/generalist.md` | Update memory preflight section |
| `agents/researcher.md` | Update memory preflight section |
| `agents/designer.md` | Update memory preflight section |
| `agents/council.md` | Update memory preflight section |
| `agents/council-advocate-for.md` | Update memory preflight section |
| `agents/council-advocate-against.md` | Update memory preflight section |
| `agents/council-judge.md` | Update memory preflight section |

### In live system (`~/.claude/agents/`):

| File | Changes |
|---|---|
| `gsd-executor.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-planner.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-debugger.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-codebase-mapper.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-research-synthesizer.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-ui-checker.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-verifier.md` | Patch memory sections with retrieval budget + trust summaries |
| `gsd-nyquist-auditor.md` | Patch memory sections with retrieval budget + trust summaries |

## 6. Verification

After implementation:
- [ ] `_shared/memory-systems.md` contains updated retrieval order (mempalace before engram)
- [ ] `_shared/memory-systems.md` contains mempalace write path with content type table
- [ ] `_shared/memory-systems.md` contains "Trust Summaries Rule" section
- [ ] `_shared/cognitive-kernel.md` evidence pull definition explicitly includes memory calls
- [ ] `agents/orchestrator.md` memory retrieval protocol updated
- [ ] `node scripts/compose-prompts.js` regenerates all prompts without errors
- [ ] `node scripts/validate-agents.js` passes
- [ ] Live system files patched with retrieval budget + trust summaries
- [ ] Commit `96769ab` changes are present in the live system

## 7. Rollback

If the live system breaks:
1. The live system files are NOT version-controlled. Make backups before patching.
2. The `8-agent-team` repo is the source of truth. Rollback = revert repo changes + re-patch live system.
