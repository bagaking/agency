#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from typing import Iterable, List, Optional


@dataclass(frozen=True)
class ItemRow:
    domain: str
    category: str
    item: str
    level: str
    when: str
    source: str
    file: str
    line: int


def _err(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)


def _is_under_dir(path: str, root: str) -> bool:
    # Resolve symlinks/.. to avoid escaping the root via relative paths.
    ap = os.path.realpath(path)
    ar = os.path.realpath(root)
    try:
        common = os.path.commonpath([ap, ar])
    except ValueError:
        return False
    return common == ar


def _strip_md_inline(s: str) -> str:
    s = s.strip()
    # Drop simple inline code ticks.
    if len(s) >= 2 and s[0] == "`" and s[-1] == "`":
        s = s[1:-1]
    return s.strip()


def _norm_level(s: str) -> str:
    s = _strip_md_inline(s)
    s = re.sub(r"\s+", " ", s).strip().upper()
    if not s:
        return ""
    # Accept variations like "MUST reuse" / "MUST" / "NICE TO HAVE".
    if s.startswith("MUST"):
        return "MUST"
    if s.startswith("SHOULD"):
        return "SHOULD"
    if s.startswith("NICE"):
        return "NICE"
    return s.split(" ", 1)[0]


def _parse_domain_from_filename(path: str) -> str:
    base = os.path.basename(path)
    m = re.match(r"^notes-reusable-items-(.+)\.md$", base)
    if not m:
        return ""
    return m.group(1)


def _iter_reusable_items_files(docs_dir: str) -> List[str]:
    out: List[str] = []
    if not os.path.isdir(docs_dir):
        return out
    for name in sorted(os.listdir(docs_dir)):
        if name.startswith("notes-reusable-items-") and name.endswith(".md"):
            out.append(os.path.join(docs_dir, name))
    return out


def _skip_frontmatter(lines: List[str]) -> int:
    # Minimal frontmatter skip: if first line is '---', skip until next '---'.
    if not lines:
        return 0
    if lines[0].rstrip("\n") != "---":
        return 0
    for i in range(1, len(lines)):
        if lines[i].rstrip("\n") == "---":
            return i + 1
    return 0


def _split_table_row(line: str) -> List[str]:
    # Markdown table rows are pipe-delimited. We keep it intentionally simple:
    # this does not support escaped pipes within cells.
    s = line.strip()
    if not s.startswith("|") or "|" not in s[1:]:
        return []
    s = s.strip("|")
    return [c.strip() for c in s.split("|")]


def _is_separator_row(cells: List[str]) -> bool:
    # E.g. | --- | --- | --- |
    if not cells:
        return False
    for c in cells:
        t = c.strip()
        if not t:
            return False
        t = t.strip(":")
        if not t or set(t) != {"-"}:
            return False
    return True


def parse_reusable_items_tables(path: str, root: str) -> List[ItemRow]:
    if not _is_under_dir(path, root):
        raise ValueError(f"path escapes root: {path}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except OSError as e:
        raise ValueError(str(e))

    start = _skip_frontmatter(lines)
    domain = _parse_domain_from_filename(path) or "unknown"
    rel = os.path.relpath(path, root)
    out: List[ItemRow] = []

    current_category = ""
    i = start
    while i < len(lines):
        raw = lines[i].rstrip("\n")

        # Track category headings to help locate the table context.
        m = re.match(r"^(#{2,4})\s+(.+)$", raw.strip())
        if m:
            current_category = m.group(2).strip()
            i += 1
            continue

        header_cells = _split_table_row(raw)
        if header_cells:
            # Require a separator row next.
            if i + 1 >= len(lines):
                i += 1
                continue
            sep_cells = _split_table_row(lines[i + 1].rstrip("\n"))
            if not sep_cells or not _is_separator_row(sep_cells):
                i += 1
                continue

            # Map columns by name (allow minor variations).
            norm = [re.sub(r"\s+", " ", c.strip().lower()) for c in header_cells]
            col_item = None
            col_level = None
            col_when = None
            col_source = None
            for idx, c in enumerate(norm):
                if c in ("item", "name"):
                    col_item = idx
                if "must" in c or "level" in c:
                    col_level = idx
                if "when" in c or "use" in c:
                    col_when = idx
                if "source" in c:
                    col_source = idx

            if col_item is None or col_level is None or col_when is None or col_source is None:
                # Not a reusable-items table; skip.
                i += 1
                continue

            # Consume rows until a non-table line.
            i += 2
            while i < len(lines):
                row_raw = lines[i].rstrip("\n")
                row_cells = _split_table_row(row_raw)
                if not row_cells:
                    break
                # Skip accidental separator repeats.
                if _is_separator_row(row_cells):
                    i += 1
                    continue
                # Pad short rows.
                if len(row_cells) < len(header_cells):
                    row_cells = row_cells + [""] * (len(header_cells) - len(row_cells))

                item = _strip_md_inline(row_cells[col_item])
                level = _norm_level(row_cells[col_level])
                when = row_cells[col_when].strip()
                source = row_cells[col_source].strip()
                if item:
                    out.append(
                        ItemRow(
                            domain=domain,
                            category=current_category or "",
                            item=item,
                            level=level,
                            when=when,
                            source=source,
                            file=rel,
                            line=i + 1,
                        )
                    )
                i += 1
            continue

        i += 1

    return out


def _load_all(root: str) -> List[ItemRow]:
    docs_dir = os.path.join(root, "docs")
    rows: List[ItemRow] = []
    for f in _iter_reusable_items_files(docs_dir):
        rows.extend(parse_reusable_items_tables(f, root))
    return rows


def cmd_list(args: argparse.Namespace) -> int:
    rows = _load_all(args.root)
    rows = _filter_rows(rows, args)
    if args.format == "json":
        print(json.dumps([asdict(r) for r in rows], ensure_ascii=False, indent=2))
        return 0
    for r in rows:
        cat = f" [{r.category}]" if r.category else ""
        print(f"{r.domain}{cat}\t{r.level}\t{r.item}\t{r.source}\t{r.file}:{r.line}")
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    q = (args.query or "").strip().lower()
    if not q:
        _err("query is required")
        return 2
    rows = _load_all(args.root)
    rows = _filter_rows(rows, args)

    def hit(r: ItemRow) -> bool:
        blob = "\n".join([r.domain, r.category, r.item, r.level, r.when, r.source]).lower()
        return q in blob

    hits = [r for r in rows if hit(r)]
    if args.max_results is not None:
        hits = hits[: args.max_results]

    if args.format == "json":
        print(json.dumps([asdict(r) for r in hits], ensure_ascii=False, indent=2))
        return 0

    for r in hits:
        cat = f" [{r.category}]" if r.category else ""
        print(f"{r.domain}{cat}\t{r.level}\t{r.item}\t{r.when}\t{r.source}\t{r.file}:{r.line}")
    return 0


def _filter_rows(rows: List[ItemRow], args: argparse.Namespace) -> List[ItemRow]:
    out = rows
    if getattr(args, "domain", None):
        out = [r for r in out if r.domain == args.domain]
    if getattr(args, "level", None):
        lvl = args.level.upper()
        if lvl == "NICE":
            out = [r for r in out if r.level == "NICE"]
        else:
            out = [r for r in out if r.level == lvl]
    return out


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(
        prog="living-docs-reusable-items.py",
        description="Query reusable-items catalogs (notes-reusable-items-*.md) by reading Markdown tables.",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list", help="list all reusable items")
    p_list.add_argument("--root", default=".", help="project root (default: .)")
    p_list.add_argument("--domain", help="filter by domain (e.g. coding)")
    p_list.add_argument("--level", help="filter by level (MUST|SHOULD|NICE)")
    p_list.add_argument("--format", default="text", choices=["text", "json"])
    p_list.set_defaults(func=cmd_list)

    p_search = sub.add_parser("search", help="search reusable items by substring")
    p_search.add_argument("--root", default=".", help="project root (default: .)")
    p_search.add_argument("query", help="search query")
    p_search.add_argument("--domain", help="filter by domain (e.g. coding)")
    p_search.add_argument("--level", help="filter by level (MUST|SHOULD|NICE)")
    p_search.add_argument("--max-results", type=int, default=20)
    p_search.add_argument("--format", default="text", choices=["text", "json"])
    p_search.set_defaults(func=cmd_search)

    args = p.parse_args(argv)
    root = os.path.realpath(args.root)
    if not os.path.isdir(root):
        _err(f"root is not a directory: {args.root}")
        return 2
    args.root = root

    try:
        return int(args.func(args))
    except ValueError as e:
        _err(str(e))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
