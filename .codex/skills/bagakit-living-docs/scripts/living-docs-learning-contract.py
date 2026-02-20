#!/usr/bin/env python3
"""Contract-based learning signal import/export/evolve for bagakit-living-docs."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SIGNAL_SCHEMA = "bagakit.learning.signal.v1"
KIND_SET = {"decision", "preference", "gotcha", "howto", "glossary"}
DOC_RE = re.compile(r"^(decision|preference|gotcha|howto|glossary)-(.+)\.md$")
SIGNAL_DOC_RE = re.compile(r"^signal-([a-z0-9-]+)-([a-z0-9-]+)\.md$")
FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n?", re.DOTALL)


def eprint(*items: object) -> None:
    print(*items, file=sys.stderr)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(text: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", text.strip().lower())
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}, text
    body = text[match.end() :]
    data: dict[str, str] = {}
    for raw in match.group(1).splitlines():
        line = raw.strip()
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data, body


def build_frontmatter(data: dict[str, str]) -> str:
    ordered = [
        "title",
        "kind",
        "status",
        "topic",
        "confidence",
        "source_signal",
        "source_schema",
        "created",
        "updated",
    ]
    keys = ordered + [k for k in data.keys() if k not in ordered]
    lines = ["---"]
    seen: set[str] = set()
    for key in keys:
        if key in seen or key not in data:
            continue
        seen.add(key)
        lines.append(f"{key}: {data[key]}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def parse_confidence(value: str, *, default: float = 0.5) -> float:
    raw = value.strip().lower()
    mapped = {"low": 0.4, "medium": 0.6, "high": 0.8}
    if raw in mapped:
        return mapped[raw]
    try:
        parsed = float(raw)
    except ValueError:
        return default
    return max(0.0, min(1.0, parsed))


def first_summary_line(body: str) -> str:
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        if line.startswith("-"):
            continue
        return line[:240]
    return ""


def locate_paths(root: Path) -> tuple[Path, Path]:
    inbox = root / "docs" / ".bagakit" / "inbox"
    memory = root / "docs" / ".bagakit" / "memory"
    inbox.mkdir(parents=True, exist_ok=True)
    memory.mkdir(parents=True, exist_ok=True)
    return inbox, memory


def iter_docs(base: Path) -> Iterable[Path]:
    for path in sorted(base.glob("*.md")):
        if path.name == "README.md":
            continue
        if SIGNAL_DOC_RE.match(path.name):
            continue
        if DOC_RE.match(path.name):
            yield path


def signal_from_doc(path: Path, source: str, root: Path) -> dict[str, Any] | None:
    match = DOC_RE.match(path.name)
    if not match:
        return None
    kind = match.group(1)
    topic = match.group(2)
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body = parse_frontmatter(text)
    summary = first_summary_line(body) or f"{kind} signal for {topic}"
    confidence = parse_confidence(fm.get("confidence", ""), default=0.5 if source == "memory" else 0.4)
    try:
        source_ref = path.relative_to(root).as_posix()
    except ValueError:
        source_ref = path.as_posix()

    evidence = [f"doc={source_ref}"]
    if fm.get("updated"):
        evidence.append(f"updated={fm['updated']}")
    return {
        "id": f"{kind}-{topic}",
        "kind": kind,
        "topic": topic,
        "summary": summary,
        "confidence": confidence,
        "evidence": evidence,
        "source_ref": source_ref,
        "source_channel": source,
    }


def validate_contract(data: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["contract root must be object"]
    if str(data.get("schema", "")).strip() != SIGNAL_SCHEMA:
        errors.append(f"schema must be '{SIGNAL_SCHEMA}'")
    signals = data.get("signals")
    if not isinstance(signals, list):
        errors.append("signals must be an array")
        return errors
    for idx, item in enumerate(signals):
        prefix = f"signals[{idx}]"
        if not isinstance(item, dict):
            errors.append(f"{prefix}: must be object")
            continue
        for key in ("id", "kind", "topic", "summary"):
            if not str(item.get(key, "")).strip():
                errors.append(f"{prefix}: missing {key}")
        kind = str(item.get("kind", "")).strip()
        if kind and kind not in KIND_SET:
            errors.append(f"{prefix}: invalid kind '{kind}'")
        try:
            conf = float(item.get("confidence", 0.5))
        except (TypeError, ValueError):
            errors.append(f"{prefix}: confidence must be number")
        else:
            if conf < 0.0 or conf > 1.0:
                errors.append(f"{prefix}: confidence must be between 0 and 1")
        evidence = item.get("evidence")
        if evidence is not None:
            if not isinstance(evidence, list) or not all(str(v).strip() for v in evidence):
                errors.append(f"{prefix}: evidence must be non-empty string array")
    return errors


def cmd_validate(args: argparse.Namespace) -> int:
    data = json.loads(Path(args.contract).read_text(encoding="utf-8"))
    errors = validate_contract(data)
    if errors:
        for err in errors:
            eprint(f"error: {err}")
        return 1
    print("ok")
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    inbox, memory = locate_paths(root)
    signals: list[dict[str, Any]] = []
    source = args.source
    if source in {"memory", "both"}:
        for doc in iter_docs(memory):
            item = signal_from_doc(doc, "memory", root)
            if item:
                signals.append(item)
    if source in {"inbox", "both"}:
        for doc in iter_docs(inbox):
            item = signal_from_doc(doc, "inbox", root)
            if item:
                signals.append(item)

    signals.sort(key=lambda x: (-float(x.get("confidence", 0.0)), str(x.get("id", ""))))
    if args.limit > 0:
        signals = signals[: args.limit]

    payload = {
        "schema": SIGNAL_SCHEMA,
        "generated_at": now_iso(),
        "producer": args.producer,
        "signals": signals,
    }

    if args.output:
        out = Path(args.output).expanduser().resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(str(out))
        return 0
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0


def build_signal_doc(signal: dict[str, Any], *, producer: str) -> str:
    kind = str(signal.get("kind", "howto"))
    topic = str(signal.get("topic", "signal"))
    confidence = float(signal.get("confidence", 0.5))
    summary = str(signal.get("summary", "")).strip()
    evidence = [str(v).strip() for v in signal.get("evidence", []) if str(v).strip()]
    now = now_iso()
    fm = build_frontmatter(
        {
            "title": f"Signal {kind}-{topic}",
            "kind": kind,
            "status": "inbox",
            "topic": topic,
            "confidence": f"{confidence:.2f}",
            "source_signal": producer,
            "source_schema": SIGNAL_SCHEMA,
            "created": now,
            "updated": now,
        }
    )
    lines = [
        fm.rstrip(),
        "",
        f"# Signal: {kind}-{topic}",
        "",
        "## Summary",
        summary or "-",
        "",
        "## Evidence",
    ]
    if evidence:
        lines.extend([f"- {item}" for item in evidence])
    else:
        lines.append("- (no evidence)")
    lines += ["", "## Contract", f"- schema: {SIGNAL_SCHEMA}", f"- producer: {producer}", ""]
    return "\n".join(lines)


def cmd_import(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    inbox, _ = locate_paths(root)
    data = json.loads(Path(args.contract).read_text(encoding="utf-8"))
    errors = validate_contract(data)
    if errors:
        for err in errors:
            eprint(f"error: {err}")
        return 1

    producer = slugify(str(data.get("producer", "")).strip()) or "external"
    count = 0
    for signal in data.get("signals", []):
        sid = slugify(str(signal.get("id", "")).strip()) or "signal"
        path = inbox / f"signal-{producer}-{sid}.md"
        path.write_text(build_signal_doc(signal, producer=producer), encoding="utf-8")
        count += 1
    print(f"imported={count}")
    return 0


def evolve_signal_doc(path: Path, memory_dir: Path, *, min_confidence: float) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body = parse_frontmatter(text)
    kind = str(fm.get("kind", "")).strip()
    topic = slugify(str(fm.get("topic", "")).strip())
    status = str(fm.get("status", "")).strip()
    confidence = parse_confidence(fm.get("confidence", ""), default=0.0)
    if status != "inbox" or kind not in KIND_SET or not topic:
        return False
    if confidence < min_confidence:
        return False

    summary = first_summary_line(body) or f"Imported signal for {kind}-{topic}"
    producer = str(fm.get("source_signal", "external")).strip() or "external"
    signal_id = path.stem
    target = memory_dir / f"{kind}-{topic}.md"
    now = now_iso()
    entry = f"- {now} | source={producer} | signal={signal_id} | confidence={confidence:.2f} | {summary}"

    if target.exists():
        current = target.read_text(encoding="utf-8", errors="replace")
        if signal_id in current:
            fm["status"] = "promoted"
            fm["updated"] = now
            path.write_text(build_frontmatter(fm) + body.lstrip(), encoding="utf-8")
            return False
        if "## Imported Contract Signals" in current:
            updated = current.rstrip() + "\n" + entry + "\n"
        else:
            updated = current.rstrip() + "\n\n## Imported Contract Signals\n" + entry + "\n"
        target.write_text(updated, encoding="utf-8")
    else:
        created = "\n".join(
            [
                "---",
                f"title: Imported {kind}-{topic}",
                f"kind: {kind}",
                "confidence: medium",
                f"created: {now}",
                f"updated: {now}",
                "---",
                "",
                f"# Imported {kind}-{topic}",
                "",
                "## Imported Contract Signals",
                entry,
                "",
            ]
        )
        target.write_text(created, encoding="utf-8")

    fm["status"] = "promoted"
    fm["updated"] = now
    path.write_text(build_frontmatter(fm) + body.lstrip(), encoding="utf-8")
    return True


def cmd_evolve(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    inbox, memory = locate_paths(root)
    promoted = 0
    scanned = 0
    for path in sorted(inbox.glob("signal-*.md")):
        if not path.is_file():
            continue
        scanned += 1
        if evolve_signal_doc(path, memory, min_confidence=args.min_confidence):
            promoted += 1
    print(f"scanned={scanned}")
    print(f"promoted={promoted}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="living-docs-learning-contract.py")
    sub = parser.add_subparsers(dest="command", required=True)

    p_validate = sub.add_parser("validate", help="validate a learning signal contract json")
    p_validate.add_argument("--contract", required=True)
    p_validate.set_defaults(func=cmd_validate)

    p_export = sub.add_parser("export", help="export inbox/memory items as contract signals")
    p_export.add_argument("--root", default=".")
    p_export.add_argument("--source", choices=["memory", "inbox", "both"], default="both")
    p_export.add_argument("--producer", default="bagakit-living-docs")
    p_export.add_argument("--limit", type=int, default=0)
    p_export.add_argument("--output", default="")
    p_export.set_defaults(func=cmd_export)

    p_import = sub.add_parser("import", help="import contract signals into inbox signal docs")
    p_import.add_argument("--root", default=".")
    p_import.add_argument("--contract", required=True)
    p_import.set_defaults(func=cmd_import)

    p_evolve = sub.add_parser("evolve", help="promote inbox signal docs into curated memory entries")
    p_evolve.add_argument("--root", default=".")
    p_evolve.add_argument("--min-confidence", type=float, default=0.7)
    p_evolve.set_defaults(func=cmd_evolve)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
