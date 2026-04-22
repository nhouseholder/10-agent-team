# Codebase Cartographer Implementation Plan

**Date:** 2026-04-22
**Status:** Draft — awaiting review
**Estimated Effort:** 25 minutes

---

## 1. Overview

Add a persistent, lightweight `codebase-map.json` artifact to the explorer agent's slow-mode reconnaissance workflow. Other agents (strategist, auditor) read this map for cross-session context, diff-impact awareness, and faster orientation.

**Principle:** Port the *concept* from Understand-Anything, not the dependency. The map is generated using existing tools (glob, grep, ast_grep, read) and stored as a compact JSON artifact.

---

## 2. JSON Schema (`codebase-map.json`)

**Target path:** `thoughts/ledgers/codebase-map.json`
**Hard constraint:** <100 lines when pretty-printed with 2-space indent.

```json
{
  "version": "1.0",
  "generated_at": "2026-04-22T12:00:00Z",
  "generator": "explorer-cartographer-v1",
  "entry_points": {
    "api": ["src/server.ts"],
    "cli": ["src/cli.ts"],
    "config": ["tsconfig.json", "vite.config.ts"]
  },
  "module_boundaries": {
    "auth": { "owns": ["src/auth/**"], "imports_from": ["db", "utils"] },
    "db": { "owns": ["src/db/**"], "imports_from": ["utils"] },
    "utils": { "owns": ["src/utils/**"], "imports_from": [] }
  },
  "hot_files": {
    "src/auth/middleware.ts": { "type": "core", "touch_count": 12 },
    "src/db/client.ts": { "type": "api", "touch_count": 8 }
  },
  "cross_cutting_concerns": {
    "logging": { "files": ["src/utils/logger.ts", "src/middleware/log.ts"], "description": "Used by every module" },
    "authz": { "files": ["src/auth/policy.ts"], "description": "Enforced in route handlers" }
  },
  "dependency_graph": {
    "src/auth/middleware.ts": { "imports": ["src/db/client.ts", "src/utils/logger.ts"], "imported_by": ["src/server.ts"] }
  },
  "regen_triggers": ["new module detected", "entry point changed", ">5 hot files changed"]
}
```

### Field definitions

| Field | Type | Purpose |
|---|---|---|
| `version` | string | Schema version for forward compatibility |
| `generated_at` | ISO8601 | Timestamp for staleness checks |
| `generator` | string | Identifier for debugging |
| `entry_points` | object<string, string[]> | Categorized entry points (api, cli, config, tests) |
| `module_boundaries` | object<string, Module> | Ownership boundaries with import relationships |
| `hot_files` | object<string, HotFile> | Frequently touched or high-risk files |
| `cross_cutting_concerns` | object<string, Concern> | Patterns that span modules (logging, auth, metrics) |
| `dependency_graph` | object<string, Deps> | Sparse import graph for critical files only |
| `regen_triggers` | string[] | Why the map was last regenerated |

**Hot file criteria:** Entry points, files with >5 imports, files imported_by >3 others, config files, or files tagged by agent discretion during slow-mode reconnaissance.

**Dependency graph scope:** Only critical files (entry points + hot files). Full graph is too large; this is a skeleton for impact analysis.

---

## 3. Exact File Changes

### 3.1 `agents/explorer.md`

**Insert new section** after `## ADDITIONAL: EXPLORER WORKFLOW (Codebase Reconnaissance)` (before `### Exploration Protocol`):

```markdown
## CODEBASE CARTOGRAPHER PROTOCOL

When in SLOW mode during reconnaissance, generate or update `thoughts/ledgers/codebase-map.json`.

### When to generate
- Map is missing or older than 7 days
- User asks for "map this codebase" or "what's the architecture"
- Slow-mode reconnaissance covers >3 modules or >10 files
- Explorer detects new entry points or module boundaries during search

### Generation workflow (5 phases)

**Phase 1: DISCOVER ENTRY POINTS**
- Glob: `package.json`, `tsconfig.json`, `vite.config.*`, `next.config.*`
- Grep: `if __name__ == "__main__"`, `listen(`, `createServer`, `export default`
- AST: function declarations at top level of `src/index.*`, `src/main.*`, `src/server.*`

**Phase 2: MAP MODULE BOUNDARIES**
- Glob directory structure 2 levels deep (`src/*/**`)
- For each top-level dir under `src/`, treat as candidate module
- Grep import statements to determine cross-module dependencies
- Record: `owns` (glob pattern), `imports_from` (module names)

**Phase 3: IDENTIFY HOT FILES**
- Entry points (always hot)
- Files with >5 incoming or outgoing edges in import graph
- Config files at repo root
- Files referenced in `README.md` or `ARCHITECTURE.md`

**Phase 4: FIND CROSS-CUTTING CONCERNS**
- Grep for patterns used across modules: `logger`, `metrics`, `auth`, `cache`, `error-handler`
- Record: description + representative files (max 3 per concern)

**Phase 5: BUILD SPARSE DEPENDENCY GRAPH**
- For hot files only, extract direct imports via grep/ast_grep
- Record `imports` and `imported_by` (reverse index)
- Cap: 50 edges total to keep JSON compact

### Output rules
- Write to `thoughts/ledgers/codebase-map.json`
- Must be <100 lines pretty-printed
- If graph exceeds 50 edges, keep only entry-point connections and prune rest
- Set `regen_triggers` to the reason for this run
```

### 3.2 `_shared/cognitive-kernel.md`

**Modify section `## 3. Memory Preflight`** — add one bullet after the mempalace bullet:

```markdown
- Check `thoughts/ledgers/codebase-map.json` if present. Use it to:
  - Confirm module boundaries before assuming file organization
  - Identify hot files when investigating regressions
  - Cross-check entry points when verifying deployment scope
```

### 3.3 `agents/auditor.md`

**Insert new subsection** under `## ADDITIONAL: AUDITOR WORKFLOW (Unified Debugging & Code Review)`, after `### Pre-Deploy Audit Gate (MANDATORY before any deploy)`:

```markdown
### Diff-Impact Check (uses codebase-map.json)

Before implementing fixes or during READ MODE review:
1. Read `thoughts/ledgers/codebase-map.json` if it exists
2. Compare changed files against:
   - `entry_points`: warn if entry point modified without explicit test coverage
   - `hot_files`: flag high-touch files; require stronger verification
   - `module_boundaries`: warn if change crosses module boundary (indicates architectural drift)
   - `cross_cutting_concerns`: require broader regression testing if concern files touched
   - `dependency_graph`: surface indirect consumers that may be affected
3. Include impact assessment in `<verification>` block:
   - `Impact: low` — isolated change within one module
   - `Impact: moderate` — touches hot file or crosses one boundary
   - `Impact: high` — touches entry point, cross-cutting concern, or >2 modules
```

### 3.4 New file: `templates/codebase-map-schema.md`

Create with the schema definition and field descriptions (extracted from §2 above) so agents and humans can reference it.

```markdown
# Codebase Map Schema v1.0

## Purpose
Lightweight, regenerable artifact for cross-session codebase context.

## Path
`thoughts/ledgers/codebase-map.json`

## Constraints
- <100 lines pretty-printed
- Sparse dependency graph (max 50 edges)
- Only critical files in graph; full graph is too large

## Fields
... (same table as §2) ...

## Hot File Criteria
1. Entry points (always)
2. Files with >5 import/export edges
3. Root-level config files
4. Files explicitly referenced in README/ARCHITECTURE docs
5. Agent discretion during slow-mode reconnaissance

## Regeneration Triggers
- Map missing or >7 days old
- New module or entry point detected
- >5 hot files changed since last generation
- User explicitly requests remap
```

---

## 4. Integration Points

### Explorer → Map
- SLOW mode reconnaissance now has a concrete output artifact
- Map generation is opt-in during slow mode, mandatory on explicit request
- Explorer still returns `<summary>/<files>/<answer>/<next>` — map is a side-effect written to disk

### Cognitive Kernel → Map
- Memory preflight now includes a fast local file read (`read thoughts/ledgers/codebase-map.json`)
- If map is stale (>7 days), agents may choose to ignore or request regeneration
- Map does not replace memory systems — it complements them with structural context

### Auditor → Map
- Diff-impact check runs automatically in READ MODE and FIX MODE
- Impact assessment feeds into QA tier selection (moderate/high may bump tier)
- No new tools required — `read` tool on the JSON file is sufficient

### Strategist → Map
- Can reference map in planning to avoid re-discovering module boundaries
- Can use dependency graph to scope impact of architectural changes

### compose-prompts.js
- No changes required. The new sections use standard markdown that compose-prompts inserts into generated prompts unchanged.
- Ensure `agents/explorer.md` and `agents/auditor.md` still contain their `<!-- @compose:insert -->` markers after edits.

---

## 5. Test & Verification Steps

1. **Schema validation:**
   - Generate a sample `codebase-map.json` against a real repo (e.g., `8-agent-team` itself)
   - Verify pretty-printed line count <100
   - Verify all required fields present

2. **Prompt composition check:**
   ```bash
   node scripts/compose-prompts.js --check
   ```
   Must pass with no stale/missing prompts.

3. **Agent prompt review:**
   - Read `agents/generated/explorer.md` — confirm cartographer section present
   - Read `agents/generated/auditor.md` — confirm diff-impact section present
   - Read `agents/generated/strategist.md` and `agents/generated/council.md` — confirm cognitive-kernel update propagated

4. **Integration dry-run:**
   - Ask explorer: "Map this codebase" → should generate `thoughts/ledgers/codebase-map.json`
   - Ask auditor to review a change touching `src/auth/middleware.ts` → should flag as hot file
   - Ask strategist: "Plan a refactor of the db module" → should reference module boundaries from map

5. **Staleness handling:**
   - Manually set `generated_at` to 8 days ago
   - Verify explorer opts to regenerate on next slow-mode task

---

## 6. Effort Estimate

| Task | Minutes |
|---|---|
| Edit `agents/explorer.md` (cartographer protocol) | 8 |
| Edit `_shared/cognitive-kernel.md` (memory preflight) | 3 |
| Edit `agents/auditor.md` (diff-impact check) | 5 |
| Create `templates/codebase-map-schema.md` | 4 |
| Run compose-prompts.js and verify | 3 |
| Dry-run test (generate sample map) | 2 |
| **Total** | **25** |

---

## 7. Anti-Patterns to Avoid

1. **Don't store full file contents in the map.** It's a skeleton, not a dump.
2. **Don't make map generation mandatory for FAST mode.** Only SLOW mode or explicit request.
3. **Don't fail if map is missing.** All agents must degrade gracefully to current behavior.
4. **Don't let the dependency graph grow unbounded.** Hard cap at 50 edges; prune aggressively.
5. **Don't reference the map in council agents unless they also receive `_shared/cognitive-kernel.md`.** Check `SOURCE_PROMPTS` in `compose-prompts.js` first.

---

## 8. Rollback Plan

If the map causes context bloat or agent confusion:
1. Remove the cartographer section from `agents/explorer.md`
2. Remove the diff-impact section from `agents/auditor.md`
3. Revert the cognitive-kernel bullet
4. Delete `thoughts/ledgers/codebase-map.json`
5. Re-run `node scripts/compose-prompts.js`

No code changes required — purely prompt-level rollback.
