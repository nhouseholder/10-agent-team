# Handoff — Agent System Consolidation (12 → 8 Agents)

**Date:** 2026-04-20
**Version:** 1.5.0
**Status:** Production-ready, all changes committed and pushed

## What Was Done

### Merged 3 Agent Pairs (v1.0)
1. **architect + strategist → @strategist** — Unified advisory agent with 8 modes: SKIP, LITE, FULL (spec→plan), SPRINT, ASSESSMENT, BRIEFING, PREDICTIVE, OPPORTUNISTIC. Deleted `agents/architect.md`.
2. **debrief → @generalist** — Added Summarization Protocol (SESSION SUMMARY, PROGRESS TRACKER, CODE SIMPLIFICATION) to generalist's capability spectrum. Deleted `agents/debrief.md`.
3. **curator + refiner → @refiner** — Single agent with INDEX MODE (memory scanning, backlog maintenance) and REFINE MODE (conservative improvements with tiered action protocol). Deleted `agents/curator.md`.

### Brainstormer → Explorer Rename (v1.1)
- Renamed `brainstormer` → `explorer` for clarity
- Deleted `agents/brainstormer.md`

### Shipper Merge + Anti-Loop Guards (v1.3)
- Merged shipper into generalist (not registered in opencode.json → broken routing)
- Replaced advisory-only anti-loop guards with structural circuit breakers (table-based processing flow)
- Codified mempalace as READ-ONLY — engram + brain-router for all writes

### Refiner Removal (v1.4)
- Removed refiner agent (9→8) — capabilities covered by opportunistic-improvement skill + compactor + memory systems
- Deleted `agents/refiner.md`

### Generalist Retool (v1.5)
- Rewrote generalist from Swiss Army knife (305 lines, 11 capabilities) to focused plan executor (~180 lines)
- PLAN MODE: backup→execute→verify→checkpoint per step, revert on failure, progress tracking
- AUTONOMOUS MODE: context→explore→implement→verify
- Moved compaction/deploy to standalone skills — orchestrator invokes directly

### Two-Phase Compaction Protocol
- **Phase 1 (Memory Extract):** Learnings → `engram_mem_save`, Decisions → `brain-router_brain_save`, Preferences → `brain-router_brain_save`
- **Phase 2 (Summary):** Write structured 600-1000 word summary with 5 headers and word budget per section
- Ensures durable knowledge persists even when compaction summary is lossy

### Council: True Multi-LLM Consensus
- 3-agent fan-out: GPT-OSS-120B (advocate-for), MiMo-V2-Flash (advocate-against), Qwen3-235B-Thinking (judge)
- All free via OpenRouter, no credit card needed
- New agent files: `council-advocate-for.md`, `council-advocate-against.md`, `council-judge.md`

### Stale Reference Purge
- 13 files cleaned across docs/, examples/, and root — 87 insertions, 152 deletions
- Zero stale references to brainstormer, shipper, architect, librarian, oracle, refiner remain

## Current 8-Agent Roster

| Agent | Role | Mode |
|---|---|---|
| **orchestrator** | Router & coordinator | primary |
| **explorer** | Codebase exploration, parallel search | all |
| **strategist** | Architecture, planning, "what's next" | all |
| **researcher** | External docs & research | all |
| **designer** | UI/UX implementation | all |
| **auditor** | Debugging, audit, code review | all |
| **council** | Multi-LLM consensus (3-model fan-out) | subagent |
| **generalist** | Plan executor, medium tasks | all |


## Key Decisions (Persisted in Memory)

1. **Structural over advisory anti-loop guards** — table-based processing with required outputs
2. **Mempalace read-only** — engram + brain-router for all writes
3. **Shipper merged into generalist** — was causing broken routing (not in opencode.json)
4. **Two-phase compaction** — extract to MCP memory first, then summarize
5. **Parenthetical aliases cause ProviderModelNotFoundError** — only bare @agent names
6. **opencode.json is source of truth** — always verify after rebase
7. **Refiner removed** — capabilities covered by opportunistic-improvement skill + compactor + memory systems
8. **Generalist retooled as plan executor** — moved compaction/deploy to skills, orchestrator invokes directly

## Repos

| Repo | Path | Purpose |
|---|---|---|
| `nhouseholder/10-agent-team` | `~/.config/opencode/` | Primary config |
| `nhouseholder/nicks-claude-code-superpowers` | `~/ProjectsHQ/superpowers/` | Mirror (skills only) |

## Known Gotchas

- **Commander** = Desktop Commander MCP server (not an agent)
- **Octto** = Claude Code CLI built-in session tools (not an agent)
- Rebase conflicts can silently overwrite opencode.json — verify agent count after every pull
- Council models are free tier — rate limits apply

## Commits This Session

## Next Steps
1. Verify all 8 agents pass validation after rebase
2. Sync latest skills to superpowers repo
3. Update docs/AGENT-REFERENCE.md with generalist v1.5 changes

## Known Gaps
- `docs/AGENT-REFERENCE.md` may still reference old generalist capabilities (305-line Swiss Army knife)
