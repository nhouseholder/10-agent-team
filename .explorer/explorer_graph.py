#!/usr/bin/env python3
"""explorer_graph.py — lightweight codebase mapper (stdlib only)."""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone

IGNORE_DIRS = {".git", "node_modules", "__pycache__", ".venv", "vendor", ".tox", "dist", "build", ".next", ".nuxt"}
IGNORE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".webm", ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z", ".db", ".sqlite", ".sqlite3"}
IMPORTANT_FILES = {"package.json", "pyproject.toml", "go.mod", "readme.md", "cargo.toml", "main.py", "index.ts", "src/index.js", "app.py", "server.ts", "index.js", "main.ts", "server.js"}

LANG_MAP = {
    ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
    ".py": "python", ".go": "go", ".rs": "rust",
}

RE_PATTERNS = {
    "typescript": {
        "import": re.compile(r"^\s*import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]|^\s*import\s+['\"]([^'\"]+)['\"]|^\s*require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"),
        "function": re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)"),
        "class": re.compile(r"^\s*(?:export\s+)?class\s+(\w+)"),
    },
    "javascript": {
        "import": re.compile(r"^\s*import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]|^\s*import\s+['\"]([^'\"]+)['\"]|^\s*require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"),
        "function": re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)"),
        "class": re.compile(r"^\s*(?:export\s+)?class\s+(\w+)"),
    },
    "python": {
        "import": re.compile(r"^\s*import\s+([\w.]+)|^\s*from\s+([\w.]+)\s+import"),
        "function": re.compile(r"^\s*def\s+(\w+)\s*\((.*?)\)"),
        "class": re.compile(r"^\s*class\s+(\w+)"),
    },
    "go": {
        "import": re.compile(r'^\s*import\s+\(\s*"([^"]+)"|^\s*import\s+"([^"]+)"'),
        "function": re.compile(r"^\s*func\s+(?:\([^)]+\)\s+)?(\w+)\s*\((.*?)\)"),
        "class": re.compile(r"^\s*type\s+(\w+)\s+struct"),
    },
    "rust": {
        "import": re.compile(r"^\s*use\s+([^;]+);|^\s*extern\s+crate\s+(\w+);"),
        "function": re.compile(r"^\s*(?:pub\s+)?fn\s+(\w+)\s*\((.*?)\)"),
        "class": re.compile(r"^\s*(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)"),
    },
}


def init_db(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        sha256 TEXT,
        last_seen TEXT,
        pagerank REAL DEFAULT 0.0,
        language TEXT,
        is_entry_point INTEGER DEFAULT 0,
        is_test INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT,
        type TEXT,
        name TEXT,
        line INTEGER,
        signature TEXT,
        FOREIGN KEY (file_path) REFERENCES files(path)
    );
    CREATE TABLE IF NOT EXISTS edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file TEXT,
        target_file TEXT,
        type TEXT,
        confidence TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_file);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_file);
    """)
    conn.commit()
    return conn


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def detect_language(path):
    ext = os.path.splitext(path)[1].lower()
    return LANG_MAP.get(ext, "unknown")


def should_ignore(root, dirs, files):
    dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
    return [f for f in files if os.path.splitext(f)[1].lower() not in IGNORE_EXTS]


def resolve_import(source_dir, imp, lang):
    if lang in ("typescript", "javascript"):
        if imp.startswith("."):
            base = os.path.normpath(os.path.join(source_dir, imp))
            for ext in ("", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"):
                candidate = base + ext
                if os.path.isfile(candidate):
                    return candidate
    elif lang == "python":
        parts = imp.split(".")
        rel = os.path.join(*parts) + ".py"
        candidate = os.path.join(source_dir, rel)
        if os.path.isfile(candidate):
            return candidate
    return None


def parse_file(path, repo_root):
    lang = detect_language(path)
    if lang == "unknown" or lang not in RE_PATTERNS:
        return lang, [], []
    patterns = RE_PATTERNS[lang]
    defs = []
    imports = []
    rel_dir = os.path.dirname(path)
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f, 1):
            for typ, pat in patterns.items():
                m = pat.search(line)
                if not m:
                    continue
                if typ == "import":
                    raw = next((g for g in m.groups() if g), None)
                    if raw:
                        resolved = resolve_import(rel_dir, raw, lang)
                        if resolved:
                            imports.append(os.path.relpath(resolved, repo_root))
                else:
                    name = m.group(1)
                    sig = m.group(2) if m.lastindex >= 2 else ""
                    defs.append({"type": typ, "name": name, "line": i, "signature": sig.strip()})
    return lang, defs, imports


def walk_repo(repo_root):
    files = []
    for root, dirs, filenames in os.walk(repo_root):
        rel_root = os.path.relpath(root, repo_root)
        if rel_root == ".":
            rel_root = ""
        filenames = should_ignore(root, dirs, filenames)
        for fn in filenames:
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, repo_root)
            files.append(rel)
    return files


def build_graph(conn, repo_root, files, incremental=False):
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    existing = {}
    if incremental:
        c.execute("SELECT path, sha256 FROM files")
        existing = {p: s for p, s in c.fetchall()}

    to_parse = []
    for rel in files:
        full = os.path.join(repo_root, rel)
        h = sha256_file(full)
        if incremental and existing.get(rel) == h:
            continue
        to_parse.append((rel, h))

    # Delete stale nodes/edges for removed files if incremental
    if incremental:
        current_set = set(files)
        c.execute("SELECT path FROM files")
        for (p,) in c.fetchall():
            if p not in current_set:
                c.execute("DELETE FROM nodes WHERE file_path=?", (p,))
                c.execute("DELETE FROM edges WHERE source_file=? OR target_file=?", (p, p))
                c.execute("DELETE FROM files WHERE path=?", (p,))

    for rel, h in to_parse:
        full = os.path.join(repo_root, rel)
        lang, defs, imports = parse_file(full, repo_root)
        is_entry = 1 if os.path.basename(rel).lower() in IMPORTANT_FILES else 0
        is_test = 1 if "/test" in rel or "/tests" in rel or rel.startswith("test") or "/__tests__/" in rel or ".test." in rel or ".spec." in rel else 0
        c.execute(
            "INSERT OR REPLACE INTO files (path, sha256, last_seen, language, is_entry_point, is_test) VALUES (?,?,?,?,?,?)",
            (rel, h, now, lang, is_entry, is_test),
        )
        c.execute("DELETE FROM nodes WHERE file_path=?", (rel,))
        c.execute("DELETE FROM edges WHERE source_file=?", (rel,))
        for d in defs:
            c.execute(
                "INSERT INTO nodes (file_path, type, name, line, signature) VALUES (?,?,?,?,?)",
                (rel, d["type"], d["name"], d["line"], d["signature"]),
            )
        for imp in set(imports):
            c.execute(
                "INSERT INTO edges (source_file, target_file, type, confidence) VALUES (?,?,?,?)",
                (rel, imp, "IMPORTS_FROM", "EXTRACTED"),
            )
    conn.commit()
    return len(to_parse)


def pagerank(conn, repo_root, damping=0.85, iterations=20):
    c = conn.cursor()
    c.execute("SELECT path FROM files")
    files = [p for (p,) in c.fetchall()]
    if not files:
        return
    c.execute("SELECT source_file, target_file FROM edges")
    edges = c.fetchall()
    out_map = {}
    in_map = {f: [] for f in files}
    for s, t in edges:
        out_map.setdefault(s, []).append(t)
        if t in in_map:
            in_map[t].append(s)
    n = len(files)
    pr = {}
    for f in files:
        base = 1.0 / n
        if os.path.basename(f).lower() in IMPORTANT_FILES:
            base += 0.05
        pr[f] = base
    for _ in range(iterations):
        new_pr = {}
        for f in files:
            s = 0.0
            for src in in_map.get(f, []):
                out_deg = len(out_map.get(src, []))
                if out_deg > 0:
                    s += pr[src] / out_deg
            new_pr[f] = (1 - damping) / n + damping * s
        pr = new_pr
    for f, v in pr.items():
        c.execute("UPDATE files SET pagerank=? WHERE path=?", (v, f))
    conn.commit()


def export_json(conn, repo_root, out_path, mode="full"):
    c = conn.cursor()
    c.execute("SELECT path, sha256, last_seen, language, pagerank, is_entry_point, is_test FROM files")
    file_rows = c.fetchall()
    c.execute("SELECT file_path, type, name, line, signature FROM nodes")
    node_rows = c.fetchall()
    c.execute("SELECT source_file, target_file, type, confidence FROM edges")
    edge_rows = c.fetchall()

    files_data = {}
    imports_map = {}
    imported_by_map = {}
    for s, t, _, _ in edge_rows:
        imports_map.setdefault(s, []).append(t)
        imported_by_map.setdefault(t, []).append(s)

    defs_map = {}
    for fp, typ, name, line, sig in node_rows:
        defs_map.setdefault(fp, []).append({"type": typ, "name": name, "line": line, "signature": sig})

    for path, sha, last, lang, pr, entry, test in file_rows:
        files_data[path] = {
            "sha256": sha,
            "last_parsed": last or datetime.now(timezone.utc).isoformat(),
            "language": lang,
            "definitions": defs_map.get(path, []),
            "imports": imports_map.get(path, []),
            "imported_by": imported_by_map.get(path, []),
            "page_rank": pr,
            "is_entry_point": bool(entry),
            "is_test": bool(test),
            "confidence": "extracted" if defs_map.get(path) or imports_map.get(path) else "inferred",
        }

    important = []
    for path, sha, last, lang, pr, entry, test in file_rows:
        reasons = []
        if pr > 0.1:
            reasons.append("high_pagerank")
        if os.path.basename(path).lower() in IMPORTANT_FILES:
            reasons.append("important_filename")
        if entry:
            reasons.append("entry_point")
        if reasons:
            important.append({"path": path, "score": pr + (0.05 if entry else 0), "reason": "|".join(reasons)})
    important.sort(key=lambda x: x["score"], reverse=True)

    meta = {
        "version": "2.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "last_commit": None,
        "map_mode": mode,
        "repo_root": os.path.abspath(repo_root),
        "total_files": len(file_rows),
        "total_edges": len(edge_rows),
    }
    try:
        import subprocess
        meta["last_commit"] = subprocess.check_output(["git", "-C", repo_root, "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        pass

    out = {"meta": meta, "files": files_data, "important_files": important}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    return out


def impact_radius(conn, paths):
    c = conn.cursor()
    result = {}
    for p in paths:
        c.execute("SELECT target_file FROM edges WHERE source_file=?", (p,))
        upstream = [t for (t,) in c.fetchall()]
        c.execute("SELECT source_file FROM edges WHERE target_file=?", (p,))
        downstream = [s for (s,) in c.fetchall()]
        result[p] = {"upstream": upstream, "downstream": downstream, "depth": 1}
    return result


def status(conn):
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM files")
    fc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM nodes")
    nc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM edges")
    ec = c.fetchone()[0]
    print(f"files: {fc}, nodes: {nc}, edges: {ec}")


def main():
    p = argparse.ArgumentParser(description="Codebase graph mapper")
    p.add_argument("repo_root", nargs="?", default=".")
    p.add_argument("--full", action="store_true")
    p.add_argument("--incremental", action="store_true")
    p.add_argument("--impact-radius", nargs="+", metavar="PATH")
    p.add_argument("--status", action="store_true")
    args = p.parse_args()

    repo_root = os.path.abspath(args.repo_root)
    explorer_dir = os.path.join(repo_root, ".explorer")
    os.makedirs(explorer_dir, exist_ok=True)
    db_path = os.path.join(explorer_dir, "graph.sqlite")
    out_path = os.path.join(explorer_dir, "codebase-map.json")

    conn = init_db(db_path)

    if args.status:
        status(conn)
        return

    if args.impact_radius:
        rad = impact_radius(conn, args.impact_radius)
        out_path = os.path.join(explorer_dir, "impact-radius.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rad, f, indent=2)
        print(json.dumps(rad, indent=2))
        return

    mode = "incremental" if args.incremental else "full"
    files = walk_repo(repo_root)
    parsed = build_graph(conn, repo_root, files, incremental=args.incremental)
    pagerank(conn, repo_root)
    export_json(conn, repo_root, out_path, mode=mode)
    print(f"Mode: {mode}, files: {len(files)}, re-parsed: {parsed}, output: {out_path}")


if __name__ == "__main__":
    main()
