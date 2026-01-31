#!/usr/bin/env python3
"""
Bagakit memory tools: index/search/get for project docs + memory files.

Goals:
- dependency-free (stdlib only)
- safe file reads (no escaping project root)
- usable without indexing; optional SQLite FTS5 index for speed
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator


ALLOWED_TOP_LEVEL = ("docs",)


def normalize_rel_path(value: str) -> str:
    v = value.strip().replace("\\", "/")
    # Strip leading "./" only (do not strip "../").
    while v.startswith("./"):
        v = v[2:]
    # Collapse accidental duplicate slashes.
    while "//" in v:
        v = v.replace("//", "/")
    return v


def is_allowed_rel_path(rel: str) -> bool:
    rel = normalize_rel_path(rel)
    for prefix in ALLOWED_TOP_LEVEL:
        if rel == prefix or rel.startswith(prefix + "/"):
            return True
    return False


def safe_resolve(root: Path, rel: str) -> Path:
    rel = normalize_rel_path(rel)
    # Reject path traversal attempts explicitly.
    if rel == ".." or rel.startswith("../") or rel.endswith("/..") or "/../" in rel:
        raise ValueError(f"unsafe path: {rel}")
    if not rel or not is_allowed_rel_path(rel):
        raise ValueError(f"disallowed path: {rel}")
    abs_path = (root / rel).resolve()
    root_abs = root.resolve()
    if not str(abs_path).startswith(str(root_abs) + os.sep) and abs_path != root_abs:
        raise ValueError("path escapes project root")
    return abs_path


def iter_memory_files(root: Path) -> Iterator[Path]:
    # Project docs: docs/**/*.md, excluding docs/.bagakit/** (bagakit internal dirs).
    docs_dir = root / "docs"
    if docs_dir.exists():
        bagakit_dir = docs_dir / ".bagakit"
        for p in docs_dir.rglob("*.md"):
            if not p.is_file():
                continue
            try:
                # Skip anything under docs/.bagakit/** to keep "project docs" separate.
                p.resolve().relative_to(bagakit_dir.resolve())
                continue
            except Exception:
                pass
            yield p

    # Bagakit memory/inbox stored under docs/.bagakit/** (committed), excluding docs/.bagakit/.generated/**.
    bagakit_root = root / "docs" / ".bagakit"
    if bagakit_root.exists():
        generated = bagakit_root / ".generated"
        for p in bagakit_root.rglob("*.md"):
            if not p.is_file():
                continue
            try:
                p.resolve().relative_to(generated.resolve())
                continue
            except Exception:
                pass
            yield p

    # No legacy layout support: memory/inbox live under docs/.bagakit/.


def relpath(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def tokenize_query(q: str) -> list[str]:
    return [t.lower() for t in re.findall(r"[A-Za-z0-9_]+", q) if t.strip()]


def chunk_lines(lines: list[str], chunk_lines_count: int, overlap: int) -> Iterator[tuple[int, int, str]]:
    if chunk_lines_count <= 0:
        chunk_lines_count = 40
    if overlap < 0:
        overlap = 0
    if overlap >= chunk_lines_count:
        overlap = max(0, chunk_lines_count - 1)

    i = 0
    n = len(lines)
    while i < n:
        start = i
        end = min(n, i + chunk_lines_count)
        text = "\n".join(lines[start:end])
        # line numbers are 1-based inclusive
        yield start + 1, end, text
        if end >= n:
            break
        i = end - overlap


def default_db_path(root: Path) -> Path:
    return root / "docs" / ".bagakit" / ".generated" / "memory.sqlite"


def ensure_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        """
    )
    conn.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
          text,
          path UNINDEXED,
          start_line UNINDEXED,
          end_line UNINDEXED
        );
        """
    )


def build_fts_query(raw: str) -> str | None:
    tokens = tokenize_query(raw)
    if not tokens:
        return None
    # Quote tokens; join with AND.
    quoted = ['"' + t.replace('"', "") + '"' for t in tokens]
    return " AND ".join(quoted)


@dataclass(frozen=True)
class SearchResult:
    path: str
    start_line: int
    end_line: int
    score: float
    snippet: str
    source: str


def scan_search(root: Path, query: str, max_results: int) -> list[SearchResult]:
    tokens = tokenize_query(query)
    if not tokens:
        return []

    results: list[SearchResult] = []
    for file_path in iter_memory_files(root):
        try:
            text = file_path.read_text(encoding="utf-8")
        except Exception:
            continue
        lines = text.splitlines()
        if not lines:
            continue

        # Find the best line-window for the token hits (simple, deterministic).
        best_score = 0
        best_start = 1
        best_end = min(len(lines), 10)
        window = 10
        for i in range(0, len(lines)):
            start = i
            end = min(len(lines), i + window)
            window_text = "\n".join(lines[start:end]).lower()
            score = 0
            for t in tokens:
                score += window_text.count(t)
            if score > best_score:
                best_score = score
                best_start = start + 1
                best_end = end

        if best_score <= 0:
            continue

        snippet_lines = lines[best_start - 1 : best_end]
        snippet = "\n".join(snippet_lines)
        results.append(
            SearchResult(
                path=relpath(root, file_path),
                start_line=best_start,
                end_line=best_end,
                score=float(best_score),
                snippet=snippet[:800],
                source="scan",
            )
        )

    results.sort(key=lambda r: (-r.score, r.path, r.start_line))
    return results[: max(1, max_results)]


def fts_search(root: Path, db_path: Path, query: str, max_results: int) -> list[SearchResult]:
    fts_q = build_fts_query(query)
    if not fts_q:
        return []
    try:
        conn = sqlite3.connect(str(db_path))
    except Exception:
        return []
    try:
        rows = conn.execute(
            """
            SELECT path, start_line, end_line, text, bm25(chunks_fts) AS rank
              FROM chunks_fts
             WHERE chunks_fts MATCH ?
             ORDER BY rank ASC
             LIMIT ?;
            """,
            (fts_q, max(1, max_results)),
        ).fetchall()
        out: list[SearchResult] = []
        for (path, start_line, end_line, text, rank) in rows:
            try:
                rank_val = float(rank) if rank is not None else 999.0
            except Exception:
                rank_val = 999.0
            if rank_val < 0:
                rank_val = 0.0
            score = 1.0 / (1.0 + rank_val)
            snippet = (text or "")[:800]
            out.append(
                SearchResult(
                    path=str(path),
                    start_line=int(start_line),
                    end_line=int(end_line),
                    score=score,
                    snippet=snippet,
                    source="fts",
                )
            )
        return out
    except Exception:
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass


def cmd_index(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    db_path = Path(args.db).resolve() if args.db else default_db_path(root)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    try:
        try:
            ensure_db(conn)
        except sqlite3.OperationalError as e:
            # Some Python builds ship without FTS5 enabled.
            print(f"error: cannot create FTS index (FTS5 unavailable): {e}")
            print("hint: use `sh scripts/bagakit_memory.sh search ...` (scan mode), or install a Python/SQLite build with FTS5.")
            return 2

        try:
            conn.execute("DELETE FROM chunks_fts;")
        except sqlite3.OperationalError:
            # If the table does not exist or is corrupted, rebuild by recreating it.
            conn.execute("DROP TABLE IF EXISTS chunks_fts;")
            ensure_db(conn)

        chunk_size = int(args.chunk_lines)
        overlap = int(args.overlap)
        total_chunks = 0

        for file_path in iter_memory_files(root):
            rel = relpath(root, file_path)
            try:
                text = file_path.read_text(encoding="utf-8")
            except Exception:
                continue
            lines = text.splitlines()
            for start_line, end_line, chunk_text in chunk_lines(lines, chunk_size, overlap):
                if not chunk_text.strip():
                    continue
                conn.execute(
                    "INSERT INTO chunks_fts(text, path, start_line, end_line) VALUES (?, ?, ?, ?);",
                    (chunk_text, rel, start_line, end_line),
                )
                total_chunks += 1

        conn.commit()
    finally:
        conn.close()

    if not args.quiet:
        print(f"indexed: db={db_path} chunks={total_chunks}")
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    query = args.query
    max_results = int(args.max_results)
    db_path = Path(args.db).resolve() if args.db else default_db_path(root)

    if not db_path.is_file():
        print(f"error: index db not found: {db_path}")
        print("hint: run `python3 scripts/bagakit_memory_index.py index` first.")
        return 2

    results = fts_search(root, db_path, query, max_results)
    if not results:
        # Deterministic behavior: no scan fallback; a missing result is a missing result.
        return 0

    for r in results:
        # Compact, greppable output:
        # path:start-end score=<..> source=<..>
        print(f"{r.path}:{r.start_line}-{r.end_line} score={r.score:.4f} source={r.source}")
        # One snippet line; keep it readable.
        snippet = r.snippet.replace("\r\n", "\n").replace("\r", "\n")
        snippet_one = re.sub(r"\n{2,}", "\n", snippet).strip()
        snippet_one = snippet_one[:300]
        if snippet_one:
            print(snippet_one)
        print("---")
    return 0


def cmd_get(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    rel = normalize_rel_path(args.path)
    abs_path = safe_resolve(root, rel)
    text = abs_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    start = int(args.from_line) if args.from_line is not None else 1
    count = int(args.lines) if args.lines is not None else len(lines)
    if start < 1:
        start = 1
    if count < 1:
        count = 1

    end = min(len(lines), start - 1 + count)
    out = "\n".join(lines[start - 1 : end])
    print(out)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="bagakit_memory_index.py")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_index = sub.add_parser("index", help="Build SQLite FTS index for docs (including docs/.bagakit/memory + inbox).")
    p_index.add_argument("--root", default=".", help="Project root (default: .)")
    p_index.add_argument("--db", default=None, help="SQLite db path (default: docs/.bagakit/.generated/memory.sqlite)")
    p_index.add_argument("--chunk-lines", default=40, help="Chunk size in lines (default: 40)")
    p_index.add_argument("--overlap", default=8, help="Chunk overlap in lines (default: 8)")
    p_index.add_argument("--quiet", action="store_true", help="Quiet output")
    p_index.set_defaults(func=cmd_index)

    p_search = sub.add_parser("search", help="Search docs (including docs/.bagakit/memory + inbox) using the FTS index.")
    p_search.add_argument("query", help="Search query")
    p_search.add_argument("--root", default=".", help="Project root (default: .)")
    p_search.add_argument("--db", default=None, help="SQLite db path (default: docs/.bagakit/.generated/memory.sqlite)")
    p_search.add_argument("--max-results", default=6, help="Max results (default: 6)")
    p_search.set_defaults(func=cmd_search)

    p_get = sub.add_parser("get", help="Safely read a snippet from an allowed file path.")
    p_get.add_argument("path", help="Relative path (docs/, docs/.bagakit/{memory,inbox}/)")
    p_get.add_argument("--root", default=".", help="Project root (default: .)")
    p_get.add_argument("--from", dest="from_line", default=None, help="1-based starting line")
    p_get.add_argument("--lines", default=None, help="Number of lines")
    p_get.set_defaults(func=cmd_get)

    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
