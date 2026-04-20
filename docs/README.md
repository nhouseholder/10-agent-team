# 8-Agent Orchestration System

A multi-agent coding orchestration system for OpenCode that routes tasks to specialized agents for optimal quality, speed, cost, and reliability.

## Overview

This system implements an 11-agent architecture where an **orchestrator** acts as a router, classifying every incoming request and dispatching it to the most efficient specialist. Agents can also chain together for multi-step workflows.

## Quick Start

1. Copy `opencode.json` to your OpenCode config directory
2. Configure MCP servers (engram, mempalace, brain-router) for persistent memory
3. Start a session — the orchestrator handles routing automatically

## Architecture

```
User Request
    ↓
Orchestrator (Router)
    ├── @brainstormer — Codebase exploration
    ├── @architect — Planning & strategy
    ├── @researcher — External docs & research
    ├── @designer — UI/UX implementation
    ├── @auditor — Debugging & implementation
    ├── @council — Multi-LLM consensus
    ├── @generalist — Medium tasks & compaction
    ├── @strategist — Strategic recommendations
    ├── @shipper — Deploy & release
    └── @debrief — Summaries & progress
```

## Key Features

- **Intelligent Routing**: 19-step decision tree classifies every request
- **Multi-Agent Chains**: "Audit then plan then build" executes automatically
- **Chain Recovery**: Failed steps retry, pause for user input, resume from ledger
- **Persistent Memory**: Three MCP memory systems (engram, mempalace, brain-router)
- **Structured Output**: Every agent returns consistent `<summary>/<changes>/<next>` format
- **Escalation Protocol**: Agents recognize their limits and recommend specialists
- **Verification Gates**: Implementation agents run lsp_diagnostics and tests before reporting complete

## Agent Summary

| Agent | Role | When to Use |
|---|---|---|
| **orchestrator** | Router & coordinator | Always — entry point for all requests |
| **brainstormer** | Codebase exploration | "Find where X is used", "Map this codebase" |
| **architect** | Planning & strategy | "How should we build this?", "Plan a feature" |
| **researcher** | External research | "How does this library work?", "Find best practices" |
| **designer** | UI/UX | "Build a dashboard", "Improve this component" |
| **auditor** | Debugging & implementation | "Fix this bug", "Review this code", "Write tests" |
| **council** | Multi-LLM consensus | "What's the best approach?" (high-stakes decisions) |
| **generalist** | Medium tasks | "Update these 5 configs", "Write docs", "Refactor" |
| **strategist** | What's next | "What should I work on?", "Review handoff" |
| **shipper** | Deploy & release | "Deploy this", "Bump version", "Ship it" |
| **debrief** | Summaries | "What did we do?", "Progress report" |

## Multi-Agent Chains

The system detects sequential language and chains agents automatically:

```
"Audit this code, then brainstorm improvements, then make a plan"
→ @auditor (audit) → @brainstormer (explore) → @architect (plan)
```

Max chain depth: 4. Recovery: retry → escalate → pause for user input.

## Memory Systems

Three persistent memory systems survive across sessions:

- **engram**: Cross-session observations, decisions, bugfixes
- **mempalace**: Semantic storage with wings/rooms/drawers
- **brain-router**: Unified memory routing with conflict detection

## Configuration

- **Config file**: `opencode.json`
- **Agent prompts**: `agents/<name>.md` (file-based) or inline in JSON
- **Shared resources**: `agents/_shared/` (memory systems, health checks)
- **Validation**: `scripts/validate-agents.js`

## Version

1.0.0 — Initial release

## License

MIT
