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
