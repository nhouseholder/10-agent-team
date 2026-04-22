# Handoff — 3-Tier Reasoning Framework Implementation

**Date:** 2026-04-21
**Version:** 1.7.1 → 2.0 (reasoning framework)
**Status:** Production-ready, all changes committed and pushed

> `CHANGELOG.md` is the canonical release history. This handoff summarizes the reasoning framework session and should stay aligned with it.

## What Was Done

### 3-Tier Reasoning Model (v2.0)
Rewrote the reasoning framework from binary fast/slow to graduated 3-tier model based on Kahneman's *Thinking, Fast and Slow* and frontier LLM patterns:

1. **FAST Mode (System 1)** — 0 evidence pulls
   - Pattern-matching, single-pass, zero research
   - Single-file edits, renames, trivial lookups
   
2. **DELIBERATE Mode (System 1.5)** — 1 evidence pull max
   - Bounded check: gist + 1 pull + go/no-go
   - One unknown, slight ambiguity, quick sanity check
   
3. **SLOW Mode (System 2)** — 3 evidence pulls max
   - Full 7-phase pipeline with hard stops
   - Architecture, debugging, planning, security

### Core Framework Changes
- **Think Tool Schema** — JSON-validatable structured reasoning scratchpad
- **Evidence Budget** — Countable, enforceable limits per mode
- **Mode State Machine** — Explicit transitions with justification
- **Meta-Cognitive Feedback Loop** — Self-calibration after every deliberation
- **Skill Compilation** — Successful SLOW patterns graduate to FAST via memory caching
- **Pre-Mortem + Outside View** — Kahneman techniques for better decisions
- **Model-Aware Damping** — Adjust expectations based on model capabilities

### Files Changed in 8-agent-team
- `_shared/cognitive-kernel.md` — Complete rewrite with 3-tier contract
- `_shared/completion-gate.md` — Added mode compliance checklist
- `agents/orchestrator.md` — Removed 150+ lines of duplicate reasoning, added route-specific classification heuristics
- `agents/generated/*.md` — Regenerated all prompts via compose-prompts.js

### Standalone Framework Repo
Created `ai-reasoning-kahneman` as a **portable, framework-agnostic** reasoning library:

| Directory | Contents |
|-----------|----------|
| `core/` | Reasoning contract, state machine, evidence budget, think tool, completion gate |
| `patterns/` | Fast, deliberate, slow modes, pre-mortem, outside view, WYSIATI guard |
| `integrations/` | OpenCode, Claude Code, LangChain, AutoGen adapters |
| `templates/` | Drop-in agent footer, orchestrator routing, think tool prompt |
| `examples/` | Minimal, multi-agent, council configs |
| `archive/` | Old v1.0 agent prompt files |

## Current 8-Agent Roster

| Agent | Role | Mode |
|---|---|---|
| **orchestrator** | Router & coordinator | primary |
| **explorer** | Codebase exploration, parallel search | all |
| **strategist** | Architecture, planning, "what's next" | all |
| **researcher** | External docs & research | all |
| **designer** | UI/UX implementation | all |
| **auditor** | Debugging, audit, code review | all |
| **council** | Structured arbitration (3-role fan-out) | subagent |
| **generalist** | Plan executor, medium tasks | all |

## Key Decisions (Persisted in Memory)

1. **3-tier reasoning** — FAST (0) → DELIBERATE (1) → SLOW (3) instead of binary fast/slow
2. **Think tool schema** — Structured JSON scratchpad, not free-text chain-of-thought
3. **Evidence budget** — Countable tool calls, breach = mandatory escalation
4. **Meta-cognitive feedback** — Agents self-evaluate mode choice for empirical calibration
5. **Skill compilation** — SLOW patterns graduate to FAST via memory caching
6. **Standalone framework** — `ai-reasoning-kahneman` is portable, not tied to 8-agent system
7. **Model-aware damping** — Adjust mode expectations based on model deliberation tendencies
8. **Pre-mortem + outside view** — Kahneman techniques integrated into SLOW mode phases

## Repos

| Repo | Path | Purpose |
|---|---|---|
| `nhouseholder/8-agent-team` | `~/.config/opencode/` | Primary config |
| `nhouseholder/ai-reasoning-kahneman` | Standalone | Portable reasoning framework |

## Known Gotchas

- **Commander** = Desktop Commander MCP server (not an agent)
- **Octto** = Claude Code CLI built-in session tools (not an agent)
- Rebase conflicts can silently overwrite opencode.json — verify agent count after every pull
- Council models are free tier — rate limits apply
- **DELIBERATE mode is new** — agents may need calibration to use it correctly (not skip to SLOW)
- **Think tool validation** — agents must fill all required fields or completion gate fails

## Commits This Session

- `cb799d5` — feat(reasoning): implement 3-tier model (FAST/DELIBERATE/SLOW) in 8-agent-team
- `af9e6dd` — feat: v2.0 standalone reasoning framework in ai-reasoning-kahneman

## Next Steps

1. **Test 3-tier model in live sessions** — Verify DELIBERATE mode catches previously under/over-thought tasks
2. **Build calibration data** — Review `reasoning/calibration` memory entries after a few sessions
3. **Port to other projects** — Copy `templates/agent-prompt-footer.md` into other repos
4. **Refine based on usage** — Adjust triggers and budgets based on empirical data
5. **Sync repos** — Ensure both local copies stay in sync with GitHub
