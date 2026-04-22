# LTM Consolidation Specification

> **Status:** DRAFT — awaiting @council arbitration  
> **Date:** 2026-04-22  
> **Author:** @strategist (based on @explorer audit findings)  
> **Scope:** 8-agent-team persistent memory system

---

## 1. RECOMMENDATION

### Primary Recommendation

**Drop mempalace from the active system. Consolidate on engram + brain-router as the sole long-term memory (LTM) stack.**

### Justification (3 Reasons)

| # | Reason | Evidence |
|---|---|---|
| 1 | **Mempalace is effectively dead** | Only 3 drawers exist after all sessions (2 test files + 1 delegation rule). The ~2.8MB `chroma.sqlite3` is empty infrastructure. No agent writes to it. |
| 2 | **Engram is fully functional and actively used** | 193 live observations in `~/.engram/engram.db`. FTS5 search, conflict detection, topic-key upserts, session tracking — all working. Agents call `engram_mem_save` on every significant action. |
| 3 | **Dual-system complexity has no ROI** | brain-router maintains fallback logic, store availability checks, subprocess calls, and hook-based mining for a store that produces zero value. Every `brain_query` pays the mempalace tax (subprocess timeout, availability check) for nothing. |

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Semantic search gap** — mempalace offered HNSW vector search; engram uses FTS5 | Low | Medium | Engram's FTS5 + scoring (recency × frequency × confidence) has proven sufficient. If semantic search becomes needed, add a lightweight vector extension to engram rather than maintaining a second store. |
| **Verbatim recall loss** — mempalace was designated for exact conversation replay | Low | Low | The 3 drawers contain only test data. All operational verbatim content lives in checkpoint files (`~/.opencode/projects/<project>/memory/`) and engram `type=discovery` entries. |
| **Rollback complexity** — if we need mempalace back | Very Low | Low | Option B keeps binaries and data intact. Full rollback = re-enable in `opencode.json` + restore prompt references. |
| **Agent confusion** — agents trained to call `mempalace_mempalace_search` | Medium | Low | Remove from prompts; agents already prefer `brain_query` and `engram_mem_search`. The mempalace retrieval order (step 5) is rarely reached. |

---

## 2. SCOPE OF REMOVAL

### Option A: Surgical (Minimal)
- Remove mempalace from `opencode.json` MCP config
- Remove mempalace references from `_shared/memory-systems.md`
- Remove mempalace from agent prompts (`orchestrator.md` + generated)
- Keep brain-router fallback, keep hooks, keep binaries
- **Effort:** ~2 hours | **Risk:** Minimal

### Option B: Moderate (RECOMMENDED)
- All of Option A, PLUS:
- Strip mempalace fallback logic from `brain_router.py`
- Remove mempalace calls from hooks (`session-start.sh`, `session-end.sh`, `pre-compact.sh`)
- Keep binaries and data for rollback
- **Effort:** ~4 hours | **Risk:** Low

### Option C: Aggressive
- All of Option B, PLUS:
- Remove mempalace binary from `persistent-brain/install.sh`
- Remove mempalace from `config/mcp-servers.json`
- Archive `~/.mempalace/` data
- Uninstall mempalace-mcp binary
- **Effort:** ~6 hours | **Risk:** Medium (harder to rollback, more files touched)

### Recommendation: Option B

**Why not A:** Leaves dead code in brain-router and hooks. The fallback logic will bit-rot and confuse future maintainers.

**Why not C:** The extra effort (uninstall scripts, archive procedures) doesn't buy meaningful benefit. The 3.7MB mempalace data is harmless. If we ever need it back, binaries present + config restore is trivial.

**Why B:** Clean removal from the active path with zero data destruction. Brain-router becomes a clean engram-only router. Hooks become engram-only. Rollback is a git revert away.

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Agent Prompts (8-agent-team repo)

**Order:** Source files first, then regenerate.

| Step | File | Change |
|---|---|---|
| 1.1 | `agents/orchestrator.md:48` | Remove `mempalace_mempalace_search` from retrieval order |
| 1.2 | `agents/council.md:56` | Remove "(engram/mempalace/brain-router)" → "(engram + brain-router)" |
| 1.3 | `_shared/memory-systems.md` | Remove mempalace section entirely; renumber engram→brain-router as 1→2; remove mempalace from retrieval order, rules, conflict resolution table |
| 1.4 | `_shared/cognitive-kernel.md:36,76` | Remove `mempalace_mempalace_search` from evidence pull definition and retrieval order |
| 1.5 | Regenerate `agents/generated/*.md` | Run `node scripts/compose-prompts.js` |
| 1.6 | `opencode.json` | Remove `mempalace` MCP server block (lines 25-34) |

**Verification:**
- `grep -r "mempalace" agents/ _shared/ opencode.json` → zero matches
- Regenerated prompts contain no mempalace references
- Commit: `git add -A && git commit -m "spec: remove mempalace from agent prompts and config"`

### Phase 2: Brain Router (persistent-brain repo)

| Step | File | Change |
|---|---|---|
| 2.1 | `router/brain_router.py:28-29,45-64` | Remove `MEMPALACE_PALACE`, `MEMPALACE_GLOBAL` constants; remove `_store_status()` mempalace checks; simplify to engram-only status |
| 2.2 | `router/brain_router.py:354-446` | Remove `mempalace_search()`, `mempalace_save()`, `mempalace_delete()`, `_resolve_palace()` |
| 2.3 | `router/brain_router.py:452-513` | Update TOOL schemas: remove `include_verbatim` from `brain_query`; remove `save_verbatim` from `brain_save`; update descriptions |
| 2.4 | `router/brain_router.py:515-645` | Simplify handlers: `handle_brain_query` removes verbatim branch; `handle_brain_save` removes mempalace save; `handle_brain_correct` removes mempalace search; `handle_brain_forget` removes mempalace delete |
| 2.5 | `router/brain_router.py:689` | Bump version to `0.4.0` |

**Verification:**
- `python3 -m py_compile router/brain_router.py` → clean
- Test `brain_query` returns only `structured` + `global` keys (no `verbatim`)
- Test `brain_save` with `save_verbatim=true` is ignored (no error)
- Commit: `git commit -am "spec: strip mempalace from brain-router"`

### Phase 3: Hooks (persistent-brain repo)

| Step | File | Change |
|---|---|---|
| 3.1 | `hooks/session-start.sh:10-12,34-36` | Remove mempalace palace resolution, mempalace count query, mempalace output line |
| 3.2 | `hooks/session-end.sh:11-12,25-28,49-53` | Remove mempalace palace resolution, mempalace fallback context search, mempalace compress |
| 3.3 | `hooks/pre-compact.sh` | Remove entire file OR make it a no-op (remove mempalace compress only) |

**Verification:**
- `bash -n hooks/session-start.sh` → clean
- `bash -n hooks/session-end.sh` → clean
- Run `session-start.sh` manually → output shows only engram counts
- Commit: `git commit -am "spec: remove mempalace from hooks"`

### Phase 4: Documentation (persistent-brain repo)

| Step | File | Change |
|---|---|---|
| 4.1 | `config/mcp-servers.json` | Remove `mempalace` server block; update `_comment` to describe engram-only setup |
| 4.2 | `config/AGENTS.md` | Rewrite to describe engram-only architecture; remove mempalace references |
| 4.3 | `README.md` (if exists) | Update architecture diagram and setup instructions |

**Verification:**
- `grep -r "mempalace" config/` → zero matches
- Commit: `git commit -am "spec: update docs for engram-only LTM"`

### Phase 5: Sync to GitHub

| Step | Action |
|---|---|
| 5.1 | Commit + push `8-agent-team` changes to GitHub |
| 5.2 | Commit + push `persistent-brain` changes to GitHub |
| 5.3 | Verify both repos are synced |

### Rollback Procedure

If anything breaks:

1. **Agent prompts:** `git revert HEAD~4` in 8-agent-team (reverts all 4 commits)
2. **Brain-router:** `git revert HEAD~3` in persistent-brain
3. **Hooks:** Restore from git or copy from `~/.mempalace/persistent-brain/hooks/`
4. **MCP config:** Re-add mempalace block to `opencode.json`
5. **Restart agent** to pick up new prompts

---

## 4. MIGRATION CONSIDERATIONS

### 4.1 The 3 Existing Mempalace Drawers

**Recommendation: Ignore.**

The 3 files are:
1. `20260419_081803_Mempalace_verbatim_test.md` — test data ("This is a verbatim memory...")
2. `20260419_082230_Mempalace_fix_test.md` — test data ("Testing that mempalace save now works...")
3. `20260421_083259_Delegation_rule___generalist_for_multi_file_implem.md` — already exists in engram as observation

All operational value is already in engram. The ChromaDB indices (~2.8MB) contain no user data.

### 4.2 Stale `~/ProjectsHQ/8-agent-team/` Copy (ARCHIVED)

**Status: Already archived.** The ghost repo at `~/ProjectsHQ/8-agent-team/` has been moved to `~/ProjectsHQ/ARCHIVED-8-agent-team-*/` with a `README-ARCHIVED.md` marker.

This was a ghost repo (old prompts with mempalace write instructions). It is NOT the live system (`~/8-agent-team/`). Risk: future agents might discover and use stale instructions.

Archive action (already completed):
```bash
mv ~/ProjectsHQ/8-agent-team ~/ProjectsHQ/ARCHIVED-8-agent-team-$(date +%Y%m%d)
touch ~/ProjectsHQ/ARCHIVED-8-agent-team-*/README-ARCHIVED.md
echo "ARCHIVED $(date). Live system is at ~/8-agent-team/" > ~/ProjectsHQ/ARCHIVED-8-agent-team-*/README-ARCHIVED.md
```

### 4.3 Engram Enhancements to Replace Lost Mempalace Functionality

**None required at this time.**

Engram already covers:
- ✅ Structured facts with conflict detection
- ✅ Full-text search (FTS5)
- ✅ Session timeline
- ✅ Topic-key upserts
- ✅ Scoring (recency × frequency × confidence)
- ✅ Global + project scope

**Future enhancement (post-consolidation):** If semantic search becomes genuinely needed, evaluate:
- SQLite `sqlite-vec` extension (lightweight, same DB)
- Engram-native vector column + cosine similarity
- Not: re-introducing a second store

---

## 5. DECISION GATE

### Verification Must Pass Before Implementation

| # | Gate | How to Verify |
|---|---|---|
| G1 | **Engram is fully operational** | `engram stats` returns >190 observations; `engram search "test"` returns results; `engram save` works |
| G2 | **No agent actively uses mempalace** | 24-hour observation: zero `mempalace_mempalace_search` calls in agent logs; zero `save_verbatim=true` flags |
| G3 | **Brain-router works without mempalace** | Run modified `brain_router.py` in test mode; `brain_query` returns structured results; no errors |
| G4 | **Hooks work without mempalace** | Run `session-start.sh` and `session-end.sh` manually; no errors; engram counts display correctly |

### Abort Conditions

| Condition | Action |
|---|---|
| Any gate fails | Stop. Fix the blocker. Do not proceed with removal. |
| User explicitly requests mempalace retention | Switch to Option A (surgical) — remove from prompts only, keep all infrastructure |
| New evidence shows mempalace has >10 drawers of non-test data | Re-evaluate. Export data to engram before removal. |
| brain-router engram-only test fails | Debug brain-router first. Mempalace removal is blocked until engram path is 100% reliable. |

---

## APPENDIX A: File Inventory

### Files to Modify (Option B)

**8-agent-team repo:**
- `agents/orchestrator.md`
- `agents/council.md`
- `_shared/memory-systems.md`
- `_shared/cognitive-kernel.md`
- `opencode.json`
- `agents/generated/*.md` (regenerated)

**persistent-brain repo:**
- `router/brain_router.py`
- `hooks/session-start.sh`
- `hooks/session-end.sh`
- `hooks/pre-compact.sh`
- `config/mcp-servers.json`
- `config/AGENTS.md`

### Files to Leave Untouched

- `persistent-brain/install.sh` (mempalace install is harmless; removing it is Option C)
- `~/.mempalace/` data directory (archive only in Option C)
- `bin/mempalace-mcp` wrapper (harmless binary)
- All backup directories (`.config/opencode.backup*/`)

---

## APPENDIX B: Effort Estimate Breakdown

| Phase | Files | Estimated Time |
|---|---|---|
| 1: Agent prompts | 4 source + 10 generated | 1.5h |
| 2: Brain router | 1 Python file (~200 lines to edit) | 1.5h |
| 3: Hooks | 3 shell scripts | 0.5h |
| 4: Docs | 2-3 markdown files | 0.5h |
| 5: Sync + commit | 2 repos | 0.5h |
| **Contingency** | — | 0.5h |
| **Total** | — | **~4.5h** |

---

*End of specification. Ready for @council arbitration.*
