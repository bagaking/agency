#!/usr/bin/env python3
"""
Bagakit Learning

Goal: turn Codex CLI session JSONL logs into draft inbox memory entries under
docs/.bagakit/inbox/, so humans can review/promote them.

Design principles:
- No new directories: reuse docs/.bagakit/{inbox,memory}/.
- Deterministic + safe defaults: always write into the target project root.
- "Semi-automatic": we extract metadata, user goals, and non-zero tool outputs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


def eprint(*a: object) -> None:
    print(*a, file=sys.stderr)


def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s


def today_yyyy_mm_dd() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def parse_ts(ts: str) -> Optional[datetime]:
    # Example: 2026-01-30T16:54:38.289Z
    try:
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        return datetime.fromisoformat(ts)
    except Exception:
        return None


def jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                # Ignore malformed lines; best-effort extraction.
                continue


def extract_text(content: Any) -> str:
    """
    Codex session JSONL stores message content as a list of blocks like:
    [{"type":"input_text","text":"..."}, ...]
    """
    if not isinstance(content, list):
        return ""
    out: List[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        t = item.get("type")
        if t in ("input_text", "output_text"):
            txt = item.get("text")
            if isinstance(txt, str) and txt.strip():
                out.append(txt.strip())
    return "\n".join(out).strip()


EXIT_CODE_RE = re.compile(r"^Exit code:\s*([0-9]+)\s*$", re.MULTILINE)


def parse_exit_code(output: str) -> Optional[int]:
    m = EXIT_CODE_RE.search(output or "")
    if not m:
        return None
    try:
        return int(m.group(1))
    except Exception:
        return None


def redact(s: str) -> str:
    # Very small, conservative redaction. Keep it deterministic and obvious.
    # We do NOT try to be perfect; this is just a guardrail.
    patterns: List[Tuple[re.Pattern[str], str]] = [
        (re.compile(r"(TOKEN\s*=\s*)([^\s\"']+)", re.IGNORECASE), r"\1<redacted>"),
        (re.compile(r"(api[_-]?key\s*[:=]\s*)([^\s\"']+)", re.IGNORECASE), r"\1<redacted>"),
        (re.compile(r"(authorization\s*[:=]\s*)([^\n]+)", re.IGNORECASE), r"\1<redacted>"),
    ]
    out = s
    for rx, repl in patterns:
        out = rx.sub(repl, out)
    return out


@dataclass
class SessionMeta:
    session_id: str = ""
    started_at: str = ""
    cwd: str = ""
    cli_version: str = ""
    model_provider: str = ""


@dataclass
class ToolCall:
    call_id: str
    name: str
    args_json: str


@dataclass
class ToolOutput:
    call_id: str
    output: str
    exit_code: Optional[int]


def guess_codex_home() -> Path:
    env = os.environ.get("CODEX_HOME")
    if env:
        return Path(env).expanduser()
    return Path("~/.codex").expanduser()


def find_sessions(codex_home: Path) -> List[Path]:
    base = codex_home / "sessions"
    if not base.is_dir():
        return []
    # Sessions are stored in subdirs by date in Codex CLI.
    files = list(base.rglob("*.jsonl"))
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files


def parse_session(path: Path) -> Tuple[SessionMeta, List[str], List[str], Dict[str, ToolCall], List[ToolOutput]]:
    meta = SessionMeta()
    user_msgs: List[str] = []
    assistant_msgs: List[str] = []
    calls: Dict[str, ToolCall] = {}
    outputs: List[ToolOutput] = []

    for obj in jsonl(path):
        typ = obj.get("type")
        payload = obj.get("payload") or {}

        if typ == "session_meta":
            p = payload
            if isinstance(p, dict):
                meta.session_id = str(p.get("id") or "")
                meta.cwd = str(p.get("cwd") or "")
                meta.cli_version = str(p.get("cli_version") or "")
                meta.model_provider = str(p.get("model_provider") or "")
                ts = p.get("timestamp")
                if isinstance(ts, str):
                    dt = parse_ts(ts)
                    meta.started_at = dt.isoformat() if dt else ts
            continue

        if typ != "response_item":
            continue

        ptype = payload.get("type")
        if ptype == "message":
            role = payload.get("role")
            content = payload.get("content")
            text = extract_text(content)
            if not text:
                continue
            text = redact(text)
            if role == "user":
                user_msgs.append(text)
            elif role == "assistant":
                assistant_msgs.append(text)
            continue

        if ptype == "function_call":
            call_id = obj.get("call_id") or payload.get("call_id")
            name = payload.get("name")
            args = payload.get("arguments")
            if isinstance(call_id, str) and isinstance(name, str) and isinstance(args, str):
                calls[call_id] = ToolCall(call_id=call_id, name=name, args_json=args)
            continue

        if ptype == "function_call_output":
            call_id = obj.get("call_id") or payload.get("call_id")
            out = payload.get("output")
            if isinstance(call_id, str) and isinstance(out, str):
                out = redact(out)
                outputs.append(ToolOutput(call_id=call_id, output=out, exit_code=parse_exit_code(out)))
            continue

    return meta, user_msgs, assistant_msgs, calls, outputs


def extract_shell_command(call: ToolCall) -> Optional[str]:
    if call.name != "shell_command":
        return None
    try:
        args = json.loads(call.args_json)
    except Exception:
        return None
    cmd = args.get("command")
    if isinstance(cmd, str):
        return cmd.strip()
    return None


def build_inbox_markdown(
    *,
    kind: str,
    topic: str,
    title: str,
    created: str,
    sources: List[str],
    meta: SessionMeta,
    user_msgs: List[str],
    assistant_msgs: List[str],
    calls: Dict[str, ToolCall],
    outputs: List[ToolOutput],
    max_items: int,
) -> str:
    lines: List[str] = []

    lines.append("---")
    lines.append(f"title: {title}")
    lines.append(f"kind: {kind}")
    lines.append("status: inbox")
    lines.append("tags:")
    lines.append(f"  - {kind}")
    lines.append("  - learning")
    lines.append("  - codex-session")
    lines.append("sources:")
    for s in sources:
        lines.append(f"  - {s}")
    lines.append(f"created: {created}")
    lines.append("---")
    lines.append("")
    lines.append("## Candidate")
    lines.append("")
    lines.append("### Session Meta")
    if meta.session_id:
        lines.append(f"- session_id: {meta.session_id}")
    if meta.started_at:
        lines.append(f"- started_at: {meta.started_at}")
    if meta.cwd:
        lines.append(f"- cwd: {meta.cwd}")
    if meta.cli_version:
        lines.append(f"- cli_version: {meta.cli_version}")
    if meta.model_provider:
        lines.append(f"- model_provider: {meta.model_provider}")
    lines.append("")

    if user_msgs:
        lines.append("### User Goals (raw excerpt)")
        for t in user_msgs[-2:]:
            lines.append("")
            lines.append("```")
            lines.append(t.strip())
            lines.append("```")
        lines.append("")

    # Non-zero exit codes tend to be the most "learnable" nuggets.
    errs: List[Tuple[int, str, str]] = []
    for o in outputs:
        if o.exit_code is None:
            continue
        if o.exit_code == 0:
            continue
        cmd = ""
        call = calls.get(o.call_id)
        if call:
            c = extract_shell_command(call)
            if c:
                cmd = c
        errs.append((o.exit_code, cmd, o.output))

    if errs:
        lines.append("### Notable Failures (tool outputs)")
        for exit_code, cmd, out in errs[:max_items]:
            lines.append("")
            lines.append(f"- Exit code: {exit_code}")
            if cmd:
                lines.append("  - Command:")
                lines.append("```bash")
                lines.append(cmd)
                lines.append("```")
            lines.append("  - Output (excerpt):")
            lines.append("```")
            # Keep it readable; this is a draft for humans.
            excerpt = out.strip()
            if len(excerpt) > 2000:
                excerpt = excerpt[:2000].rstrip() + "\n…(truncated)…"
            lines.append(excerpt)
            lines.append("```")
        lines.append("")

    if assistant_msgs:
        lines.append("### Assistant Output (raw excerpt)")
        lines.append("")
        lines.append("```")
        excerpt = assistant_msgs[-1].strip()
        if len(excerpt) > 2500:
            excerpt = excerpt[:2500].rstrip() + "\n…(truncated)…"
        lines.append(excerpt)
        lines.append("```")
        lines.append("")

    lines.append("### Extracted Patterns (fill in)")
    lines.append("- <pattern>: <when it happens> -> <what to do> (links/snippets above)")
    lines.append("")
    lines.append("## Promote To")
    lines.append(f"- `docs/.bagakit/memory/{kind}-{topic}.md` (curated), or")
    lines.append("- `docs/<type>-<topic>.md` (normative/deep guide)")
    lines.append("")
    return "\n".join(lines)


def next_available_path(base: Path) -> Path:
    if not base.exists():
        return base
    stem = base.stem
    suffix = base.suffix
    parent = base.parent
    i = 2
    while True:
        p = parent / f"{stem}-{i}{suffix}"
        if not p.exists():
            return p
        i += 1


def cmd_sessions(args: argparse.Namespace) -> int:
    codex_home = Path(args.codex_home).expanduser()
    files = find_sessions(codex_home)
    if not files:
        eprint(f"no sessions found under: {codex_home / 'sessions'}")
        return 2
    for p in files[: args.limit]:
        print(str(p))
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    inbox_dir = root / "docs" / ".bagakit" / "inbox"
    inbox_dir.mkdir(parents=True, exist_ok=True)

    session_path: Optional[Path] = None
    if args.session:
        session_path = Path(args.session).expanduser().resolve()
    elif args.last:
        codex_home = Path(args.codex_home).expanduser()
        sessions = find_sessions(codex_home)
        if not sessions:
            eprint(f"no sessions found under: {codex_home / 'sessions'}")
            return 2
        session_path = sessions[0].resolve()
    else:
        eprint("error: provide --session or --last")
        return 2

    if not session_path.is_file():
        eprint(f"error: session file not found: {session_path}")
        return 2

    meta, user_msgs, assistant_msgs, calls, outputs = parse_session(session_path)

    kind = args.kind or ""
    if not kind:
        kind = "gotcha" if any((o.exit_code or 0) != 0 for o in outputs if o.exit_code is not None) else "howto"
    if kind not in {"decision", "preference", "gotcha", "glossary", "howto"}:
        eprint(f"error: invalid kind: {kind}")
        return 2

    created = today_yyyy_mm_dd()
    sid_short = meta.session_id[:8] if meta.session_id else "unknown"
    topic = args.topic or f"session-{created.replace('-', '')}-{sid_short}"
    topic = slugify(topic) or f"session-{created.replace('-', '')}-{sid_short}"

    title = args.title or f"Session learnings ({created})"
    sources: List[str] = [str(session_path)]
    if meta.cwd:
        sources.append(f"cwd: {meta.cwd}")

    md = build_inbox_markdown(
        kind=kind,
        topic=topic,
        title=title,
        created=created,
        sources=sources,
        meta=meta,
        user_msgs=user_msgs,
        assistant_msgs=assistant_msgs,
        calls=calls,
        outputs=outputs,
        max_items=args.max_items,
    )

    out_path = inbox_dir / f"{kind}-{topic}.md"
    out_path = next_available_path(out_path)

    if args.dry_run:
        print(md)
        return 0

    out_path.write_text(md, encoding="utf-8")
    print(str(out_path.relative_to(root)))
    return 0


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(prog="bagakit_learning.py")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_sessions = sub.add_parser("sessions", help="List recent Codex session JSONL paths.")
    p_sessions.add_argument("--codex-home", default=str(guess_codex_home()), help="Codex home dir (default: $CODEX_HOME or ~/.codex)")
    p_sessions.add_argument("--limit", type=int, default=10, help="Max session files to show.")
    p_sessions.set_defaults(func=cmd_sessions)

    p_extract = sub.add_parser("extract", help="Extract a session into a draft inbox memory entry.")
    p_extract.add_argument("--root", default=".", help="Target project root (default: .)")
    p_extract.add_argument("--session", default=None, help="Path to a session .jsonl file.")
    p_extract.add_argument("--last", action="store_true", help="Use the most recent session under --codex-home.")
    p_extract.add_argument("--codex-home", default=str(guess_codex_home()), help="Codex home dir (default: $CODEX_HOME or ~/.codex)")
    p_extract.add_argument("--kind", default=None, help="Memory kind (decision|preference|gotcha|glossary|howto). Default: heuristic.")
    p_extract.add_argument("--topic", default=None, help="Topic slug for filename. Default: derived from date+session id.")
    p_extract.add_argument("--title", default=None, help="Frontmatter title. Default: 'Session learnings (YYYY-MM-DD)'.")
    p_extract.add_argument("--max-items", type=int, default=6, help="Max notable failure items to include.")
    p_extract.add_argument("--dry-run", action="store_true", help="Print markdown instead of writing a file.")
    p_extract.set_defaults(func=cmd_extract)

    args = p.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

