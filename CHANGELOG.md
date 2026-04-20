# Changelog

All notable changes to the Agent Orchestration System.

## [1.2.0] - 2026-04-19

### Consolidated: 12 → 10 Agents

Merged overlapping agent capabilities to reduce total agent count while keeping each agent's scope wide enough to be useful.

### Merged Agents
- **architect + strategist → @strategist**: Unified into single advisory agent with 8 modes — SKIP, LITE, FULL (spec → plan), SPRINT, ASSESSMENT, BRIEFING, PREDICTIVE, OPPORTUNISTIC. Deleted `agents/architect.md`.
- **debrief → @generalist**: Summarization protocol (SESSION SUMMARY, PROGRESS TRACKER, CODE SIMPLIFICATION) added to generalist's capability spectrum. Deleted `agents/debrief.md`.
- **curator + refiner → @refiner**: Merged into single agent with two modes — INDEX MODE (memory scanning, backlog maintenance) and REFINE MODE (conservative improvements with tiered action protocol). Deleted `agents/curator.md`.

### Updated Files
- `opencode.json`: Updated to 10 agents, removed duplicate strategist entry and debrief entry
- `agents/orchestrator.md`: Updated team list, decision tree, delegation table, custom personalities
- `docs/AGENT-REFERENCE.md`: Updated @strategist section (8 modes, spec/plan workflow), @generalist section (Summarization Protocol), removed @debrief and @architect sections, updated all cross-references
- `CHANGELOG.md`: This file

### Agents (10 total)
- **orchestrator**: Router with 19-step decision tree, chain protocol, error handling
- **brainstormer**: Codebase exploration with parallel search protocol
- **strategist**: Unified advisor — architecture, planning, spec-writing, "what's next" (8 modes)
- **researcher**: External research with source hierarchy (Tier 1-3)
- **designer**: UI/UX with intentional minimalism philosophy
- **auditor**: Dual-mode (READ/FIX) with verification gates
- **council**: Multi-LLM consensus via council_session tool
- **shipper**: Deploy pipeline with pre-flight gates and rollback
- **generalist**: Medium tasks, context compaction, session summarization
- **refiner**: Continuous improvement with INDEX MODE and REFINE MODE

## [1.1.0] - 2026-04-19

### Added
- **@curator** — Continuous improvement backlog from memory synthesis
- **@refiner** — Conservative, targeted improvements with safety gates
- **Curator-Refiner pipeline** — Curator indexes memory → maintains backlog → Refiner reviews and executes tiered improvements
- **Backlog utility** — `scripts/curator-backlog.js` for CLI backlog management
- Validation script for agent configuration
- Example configurations (minimal, standard, with-memory, enterprise)
- Health monitoring framework

### Fixed
- @auditor identity conflict (was "You are Fixer")
- @architect contradictions (READ-ONLY + execute)
- Duplicate text in decision tree step 13
- Missing output formats in 7 agents
- Missing escalation paths in 5 agents
- Missing verification steps in @auditor
- Missing edge cases in decision tree (6 new cases)
- Missing chain recovery protocol

## [1.0.0] - 2026-04-19

### Added
- 12-agent orchestration system with intelligent routing
- 21-step decision tree for task classification
- Multi-agent chain protocol with automatic detection
- Chain recovery: retry → escalate → pause/resume
- Structured output format for all agents
- Escalation protocol for all agents
- Verification steps for @auditor (lsp_diagnostics + tests)
- Three persistent memory systems (engram, mempalace, brain-router)
- Context compaction protocol in @generalist
- Model configuration structure (default/fast/smart/creative)
- Error handling and fallback mechanisms
- Complete documentation (README, USAGE, CHAIN-EXAMPLES, TROUBLESHOOTING, ARCHITECTURE, AGENT-REFERENCE)
- File-based prompt format for all agents
- Contribution guidelines

### Agents
- **orchestrator**: Router with 21-step decision tree, chain protocol, error handling
- **brainstormer**: Codebase exploration with parallel search protocol
- **architect**: Planning & strategy with SKIP/LITE/FULL/SPRINT modes
- **researcher**: External research with source hierarchy (Tier 1-3)
- **designer**: UI/UX with intentional minimalism philosophy
- **auditor**: Dual-mode (READ/FIX) with verification gates
- **council**: Multi-LLM consensus via council_session tool
- **generalist**: Medium tasks with context compaction capabilities
- **strategist**: Strategic recommendations with 4 modes
- **shipper**: Deploy pipeline with pre-flight gates and rollback
- **debrief**: Summaries with 3 modes (session/progress/simplify)
- **refiner**: Continuous improvement with two modes — INDEX MODE (memory scanning, backlog maintenance) and REFINE MODE (conservative improvements with tiered action protocol)
