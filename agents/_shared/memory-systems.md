## MEMORY SYSTEMS (MANDATORY)

You have access to three persistent memory systems via MCP tools:

1. **engram** — Cross-session memory for observations, decisions, bugfixes, patterns, and learnings.
   - Use `engram_mem_search` to find past decisions, bugs fixed, patterns, or context from previous sessions
   - Use `engram_mem_context` to get recent memory context at session start
   - Use `engram_mem_save` to save important observations (decisions, architecture, bugfixes, patterns)
   - Use `engram_mem_timeline` to understand chronological context around an observation
   - ALWAYS search engram before starting work on a project you've touched before

2. **mempalace** — Semantic memory palace with wings, rooms, and drawers for verbatim content storage.
   - Use `mempalace_mempalace_search` for semantic search across all stored content
   - Use `mempalace_mempalace_list_wings` and `mempalace_mempalace_list_rooms` to explore structure
   - Use `mempalace_mempalace_add_drawer` to store verbatim content (decisions, meeting notes, code patterns)
   - Use `mempalace_mempalace_traverse` to follow cross-wing connections between related topics
   - Use `mempalace_mempalace_kg_query` for knowledge graph queries about entities and relationships

3. **brain-router** — Unified memory router that auto-routes between structured facts and conversation history.
   - Use `brain-router_brain_query` for any memory lookup (auto-routes to the right store)
   - Use `brain-router_brain_save` to save structured facts with conflict detection
   - Use `brain-router_brain_context` at session start to load context

**RULES:**
- At session start: ALWAYS call `engram_mem_context` and `brain-router_brain_context` to restore context
- Before working on known projects: ALWAYS search engram and mempalace for prior decisions and patterns
- After completing significant work: ALWAYS save observations via `engram_mem_save` and `brain-router_brain_save`
- When uncertain about past decisions: search before guessing
- Memory systems survive across sessions — use them to maintain continuity

## Confidence Gate (MANDATORY — all agents)

**Design philosophy:** Confidence is verified by signals, not self-reported. Agents verify their work against objective signals before claiming success.

### Verification Signals
Before claiming a task is complete, check these signals:

| Signal | Check | Green | Red |
|---|---|---|---|
| **tool_call_coverage** | Did you use the right tools for the task? | Used all relevant tools (read, edit, verify) | Skipped verification tools |
| **test_pass_rate** | Do tests pass? | All tests pass or no tests exist | Tests fail or were skipped when they shouldn't be |
| **lsp_clean** | Any LSP errors in changed files? | `lsp_diagnostics` returns clean | Errors found in changed files |
| **output_scope_ratio** | Did you address everything requested? | All requirements addressed | Partial implementation, TODOs left |

### Confidence Levels
Based on signal assessment:

- **HIGH** (all green): Proceed, claim completion
- **MEDIUM** (1 yellow): Note the concern, proceed with caveat
- **LOW** (≥2 red or test fail): STOP and escalate

### Low Confidence Protocol
When confidence is LOW:
1. Do NOT claim the task is complete
2. Identify which signals are red
3. If fixable: attempt fix, re-verify
4. If not fixable: escalate to @auditor or ask user for direction
5. Output: `<confidence level="LOW" signals="test_fail,lsp_errors">Escalating to @auditor: [reason]</confidence>`

### Integration with Complexity Tiers
- **SHALLOW tasks**: Quick signal check (lsp + scope only), skip test coverage if no tests exist
- **MODERATE tasks**: Full signal check required
- **DEEP/CRITICAL tasks**: Full signal check + adversarial review of confidence assessment
