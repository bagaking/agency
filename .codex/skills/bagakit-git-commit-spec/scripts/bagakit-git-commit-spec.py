#!/usr/bin/env python3
"""Artifact and message helpers for bagakit-git-commit-spec."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


HOOK_MARKER = "BAGAKIT_COMMIT_SPEC_HOOK"
FRONTMATTER_SCHEMA = "bagakit.commit-spec/v3"
COMMIT_SPEC_KIND = "commit_message_spec"
SUBJECT_RE = re.compile(r"^[a-z][a-z0-9-]*(?:\([^)]+\))?: .+$")
UTC_TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
SESSION_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$")
COMMIT_SHA_RE = re.compile(r"^[0-9a-f]{7,40}$")
DRIVER_NAME_RE = re.compile(r"^[a-z][a-z0-9_-]*$")
SESSION_ARTIFACTS_LOCAL = "local"
SESSION_ARTIFACTS_TRACKED = "tracked"
SESSION_GITIGNORE_TEXT = (
    "# bagakit-git-commit-spec local mode\n"
    "# Keep commit-spec session artifacts local by default.\n"
    "*\n"
    "!.gitignore\n"
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def utc_day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    if not value:
        raise SystemExit("error: topic slug became empty")
    return value


def toml_scalar(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    return value.strip()


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def run_git(root: Path, args: list[str]) -> str:
    cmd = ["git", *args]
    try:
        out = subprocess.check_output(cmd, cwd=root, text=True)
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"error: git command failed: {' '.join(cmd)}") from exc
    return out


def ensure_git_repo(root: Path) -> None:
    try:
        run_git(root, ["rev-parse", "--is-inside-work-tree"])
    except SystemExit as exc:
        raise SystemExit(f"error: not a git repository: {root}") from exc


def skill_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def ensure_session_gitignore(root: Path, mode: str) -> Path | None:
    if mode != SESSION_ARTIFACTS_LOCAL:
        return None

    ignore_path = root / ".bagakit" / "commit-spec" / ".gitignore"
    if ignore_path.is_file():
        return None

    write_text(ignore_path, SESSION_GITIGNORE_TEXT)
    return ignore_path


def detect_driver_signals(root: Path) -> dict[str, bool]:
    return {
        "ftharness": (root / ".bagakit" / "ft-harness" / "index" / "feats.json").is_file(),
        "openspec": (root / "openspec" / "changes").is_dir(),
        "longrun": (root / ".bagakit" / "long-run" / "bk-execution-table.json").is_file(),
    }


def detect_default_driver(root: Path) -> str:
    detected = [name for name, present in detect_driver_signals(root).items() if present]
    if len(detected) == 1:
        return detected[0]
    return "none"


def normalize_activity(value: str) -> str:
    cleaned = value.strip()
    return cleaned if cleaned else "none"


def normalize_driver(value: str) -> str:
    cleaned = value.strip().lower()
    return cleaned if cleaned else "none"


def parse_driver_name(value: str) -> tuple[bool, str]:
    raw = normalize_driver(value)
    if raw == "none":
        return True, ""
    if "<" in raw or ">" in raw:
        return False, "driver contains placeholder token"
    if not DRIVER_NAME_RE.match(raw):
        return False, "driver must be 'none' or a semantic token like ftharness/openspec/longrun"
    return True, ""


def parse_driver_meta(value: str) -> tuple[bool, str]:
    """Return (ok, message)."""
    raw = value.strip()
    if raw == "none":
        return True, ""

    if "<" in raw or ">" in raw:
        return False, "driver_meta contains placeholder token"

    # Require key=value segments to keep parseability.
    segments = [segment.strip() for segment in raw.split(";") if segment.strip()]
    if not segments or not all("=" in segment for segment in segments):
        return False, "driver_meta must be 'none' or key=value pairs separated by ';'"
    return True, ""


@dataclass
class ChangeItem:
    status: str
    path: str


@dataclass
class ModuleEntry:
    name: str
    scope: str
    summary: str
    refs: str


@dataclass
class RemainingEntry:
    what: str
    why_pending: str
    plan: str


def parse_status_line(line: str) -> ChangeItem | None:
    if not line.strip():
        return None
    status = line[:2]
    path = line[3:]
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    return ChangeItem(status=status, path=path)


def gather_changes(root: Path, staged_only: bool) -> list[ChangeItem]:
    if staged_only:
        raw = run_git(root, ["diff", "--cached", "--name-status"])
        items: list[ChangeItem] = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            parts = line.split("\t", 1)
            if len(parts) != 2:
                continue
            status, path = parts
            items.append(ChangeItem(status=status[:2].ljust(2), path=path))
        return items

    raw = run_git(root, ["status", "--porcelain"])
    items = []
    for line in raw.splitlines():
        item = parse_status_line(line)
        if item:
            items.append(item)
    return items


def classify_kind(path: str) -> str:
    lower = path.lower()
    name = Path(lower).name
    if lower.startswith("docs/") or name.endswith((".md", ".rst", ".txt", ".adoc")):
        return "docs"
    if any(token in lower for token in ["/test", "/tests", "__tests__", "spec.", "_test.", ".spec."]):
        return "test"
    if lower.startswith(".github/") or name in {
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "requirements.txt",
        "pyproject.toml",
        "go.mod",
        "go.sum",
        "cargo.toml",
        "cargo.lock",
        "makefile",
    }:
        return "config"
    if lower.startswith("scripts/") or lower.startswith("tools/"):
        return "tooling"
    return "code"


def classify_area(path: str) -> str:
    parts = Path(path).parts
    if not parts:
        return "root"
    first = parts[0]
    if first.startswith(".") and len(parts) > 1:
        return parts[1]
    return first


def suggest_type(kind: str) -> str:
    return {
        "docs": "docs",
        "test": "test",
        "config": "chore",
        "tooling": "chore",
        "code": "refactor",
    }.get(kind, "chore")


def parse_module_entry(raw: str, fallback_scope: str) -> ModuleEntry:
    parts = [part.strip() for part in raw.split("|")]
    if len(parts) >= 4:
        return ModuleEntry(parts[0], parts[1], parts[2], parts[3])
    if len(parts) == 3:
        return ModuleEntry(parts[0], parts[1], parts[2], f"{parts[0]}:{parts[1]}")
    if len(parts) == 2:
        return ModuleEntry(parts[0], parts[1], "summarize module delta", f"{parts[0]}:{parts[1]}")
    if len(parts) == 1 and parts[0]:
        return ModuleEntry(parts[0], fallback_scope or "core", "summarize module delta", f"{parts[0]}:1")
    return ModuleEntry("core", fallback_scope or "core", "summarize module delta", "README.md:1")


def parse_remaining_entry(raw: str) -> RemainingEntry:
    parts = [part.strip() for part in raw.split("|")]
    if len(parts) != 3 or not all(parts):
        raise SystemExit(
            "error: --remaining-item must be in format "
            "'<what one sentence>|<why pending one sentence>|<plan one sentence>'"
        )
    return RemainingEntry(what=parts[0], why_pending=parts[1], plan=parts[2])


def extract_section(text: str, heading: str) -> str:
    pattern = rf"(?ms)^## {re.escape(heading)}\n(.*?)(?=^## |\Z)"
    match = re.search(pattern, text)
    return match.group(1).strip() if match else ""


def render_simple_section(title: str, bullets: list[str], fallback: str) -> list[str]:
    lines = [f"## {title}"]
    if bullets:
        lines.extend(f"- {item}" for item in bullets)
    else:
        lines.append(f"- {fallback}")
    lines.append("")
    return lines


def render_module_section(modules: list[ModuleEntry]) -> list[str]:
    lines = ["## Changes by Module"]
    for item in modules:
        label = f"**{item.name}** ({item.scope})" if item.scope else f"**{item.name}**"
        lines.append(f"- {label}")
        lines.append(f"  - Change: {item.summary}")
        lines.append(f"  - Key refs: {item.refs}")
    lines.append("")
    return lines


def render_why_section(before: str, change: str, gain: str) -> list[str]:
    lines = ["## Why This Change"]
    lines.append(f"- Before: {before}")
    lines.append(f"- Change: {change}")
    lines.append(f"- Gain: {gain}")
    lines.append("")
    return lines


def render_remaining_section(entries: list[RemainingEntry]) -> list[str]:
    lines = ["## Remaining Work"]
    if not entries:
        lines.append("- None")
        lines.append("")
        return lines
    for entry in entries:
        lines.append(f"- What: {entry.what}")
        lines.append(f"- Why Pending: {entry.why_pending}")
        lines.append(f"- Plan: {entry.plan}")
    lines.append("")
    return lines


def render_frontmatter(meta: dict[str, str]) -> list[str]:
    lines = ["+++"]
    for key, value in meta.items():
        lines.append(f"{key} = {toml_scalar(value)}")
    lines.extend(["+++", ""])
    return lines


def parse_frontmatter_from_message(text: str) -> tuple[dict[str, str], str, list[str]]:
    errors: list[str] = []
    lines = text.splitlines()
    if not lines:
        return {}, "", ["message is empty"]

    if len(lines) < 3:
        return {}, "", ["message too short to include frontmatter and markdown body"]

    if lines[1].strip():
        errors.append("second line must be blank")

    if len(lines) < 4 or lines[2].strip() != "+++":
        errors.append("frontmatter must start on line 3 with '+++' (TOML frontmatter)")
        return {}, "\n".join(lines[2:]) if len(lines) > 2 else "", errors

    idx = 3
    front_lines: list[str] = []
    while idx < len(lines) and lines[idx].strip() != "+++":
        front_lines.append(lines[idx])
        idx += 1

    if idx >= len(lines):
        errors.append("frontmatter closing '+++' not found")
        return {}, "", errors

    meta: dict[str, str] = {}
    for line in front_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if "=" not in stripped:
            errors.append(f"invalid frontmatter line: {line}")
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        if not key:
            errors.append(f"invalid frontmatter key in line: {line}")
            continue
        meta[key] = unquote(value)

    body_lines = lines[idx + 1 :]
    if body_lines and body_lines[0].strip():
        errors.append("blank line required after frontmatter closing")

    body = "\n".join(body_lines).lstrip("\n")
    return meta, body, errors


def prompt_yes_no(question: str, default_yes: bool = True) -> bool:
    if not sys.stdin.isatty():
        return False
    suffix = "[Y/n]" if default_yes else "[y/N]"
    answer = input(f"{question} {suffix} ").strip().lower()
    if not answer:
        return default_yes
    return answer in {"y", "yes"}


def render_hook_from_template(template_path: Path, skill_hint: Path) -> str:
    template = read_text(template_path)
    return template.replace("__SKILL_DIR_HINT__", str(skill_hint))


def install_commit_msg_hook(root: Path, force: bool) -> Path:
    ensure_git_repo(root)
    git_dir = Path(run_git(root, ["rev-parse", "--git-dir"]).strip())
    if not git_dir.is_absolute():
        git_dir = root / git_dir
    hooks_dir = git_dir / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)

    hook_path = hooks_dir / "commit-msg"
    template_path = skill_dir() / "scripts" / "templates" / "commit-msg-template.sh"
    if not template_path.is_file():
        raise SystemExit(f"error: hook template missing: {template_path}")

    if hook_path.exists():
        existing = read_text(hook_path)
        if HOOK_MARKER not in existing and not force:
            raise SystemExit(
                f"error: existing hook at {hook_path} is not managed by bagakit; use --force to replace"
            )
        if HOOK_MARKER not in existing and force:
            backup = hook_path.with_name(f"commit-msg.bak.{utc_day().replace('-', '')}")
            shutil.copy2(hook_path, backup)
            print(f"backup: {backup}")

    rendered = render_hook_from_template(template_path, skill_dir())
    write_text(hook_path, rendered)
    hook_path.chmod(0o755)
    return hook_path


def cmd_install_hooks(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    hook_path = install_commit_msg_hook(root, force=args.force)
    print(f"installed: {hook_path}")
    return 0


def cmd_init(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    ensure_git_repo(root)

    topic = args.topic.strip()
    slug = slugify(topic)
    ignored = ensure_session_gitignore(root, args.session_artifacts)
    session = f"{utc_day()}-{slug}"
    session_dir = root / ".bagakit" / "commit-spec" / session
    if session_dir.exists() and not args.force:
        raise SystemExit(f"error: session already exists: {session_dir}")

    session_dir.mkdir(parents=True, exist_ok=True)

    write_text(
        session_dir / "findings.md",
        "# Commit Findings\n\n"
        "| Source | Finding | Decision | Reason |\n"
        "| --- | --- | --- | --- |\n"
        "| <path/url> | <summary> | reuse/adapt/reject | <why> |\n",
    )

    write_text(
        session_dir / "split-plan.md",
        "# Split Plan\n\n"
        f"- Session: `{session}`\n"
        f"- Topic: {topic}\n"
        f"- Created: {utc_now_iso()}\n\n"
        "## Planned Commits\n\n"
        "| Commit | Intent | Scope | Checks | Rollback |\n"
        "| --- | --- | --- | --- | --- |\n"
        "| C1 | <intent> | <scope> | <command/evidence> | <revert note> |\n",
    )

    write_text(
        session_dir / "progress.md",
        "# Commit Progress\n\n"
        "## Timeline\n\n"
        f"- {utc_now_iso()} initialized session\n",
    )

    write_text(
        session_dir / "memory.md",
        "# Commit Session Memory\n\n"
        "## Summary\n"
        "- Topic: <fill>\n"
        "- Key split decisions: <fill>\n"
        "- Reusable rules: <fill>\n",
    )

    write_text(
        session_dir / "archive.md",
        "# Commit Session Archive\n\n"
        "Status: pending\n"
        "- action_handoff: <pending>\n"
        "- memory_handoff: <pending>\n"
        "- archive: <pending>\n",
    )

    if ignored:
        print(f"wrote: {ignored}")
    print(f"initialized: {session_dir}")

    mode = args.install_hooks
    if mode == "yes":
        hook_path = install_commit_msg_hook(root, force=args.force_hooks)
        print(f"installed: {hook_path}")
    elif mode == "ask":
        if sys.stdin.isatty():
            if prompt_yes_no("Install commit-msg hook template now?", default_yes=True):
                hook_path = install_commit_msg_hook(root, force=args.force_hooks)
                print(f"installed: {hook_path}")
            else:
                print("skipped: hook install")
        else:
            print(
                "hint: run `sh scripts/bagakit-git-commit-spec.sh install-hooks --root .` "
                "to enable commit message gate hook"
            )
    return 0


def cmd_inventory(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    ensure_git_repo(root)
    session_dir = Path(args.dir).resolve()
    if not session_dir.is_dir():
        raise SystemExit(f"error: session dir not found: {session_dir}")

    items = gather_changes(root, staged_only=args.staged_only)
    if not items:
        raise SystemExit("error: no changed files found")

    groups: dict[tuple[str, str], list[ChangeItem]] = defaultdict(list)
    for item in items:
        kind = classify_kind(item.path)
        area = classify_area(item.path)
        groups[(kind, area)].append(item)

    lines = [
        "# Suggested Split Inventory",
        "",
        f"Generated: {utc_now_iso()}",
        f"Root: `{root}`",
        "",
        "| Group | Suggested Type | Files |",
        "| --- | --- | --- |",
    ]

    serializable = []
    for idx, ((kind, area), members) in enumerate(sorted(groups.items()), start=1):
        group = f"G{idx}-{kind}-{area}"
        ctype = suggest_type(kind)
        files = "<br>".join(sorted(m.path for m in members))
        lines.append(f"| {group} | {ctype} | {files} |")
        serializable.append(
            {
                "group": group,
                "kind": kind,
                "area": area,
                "suggested_type": ctype,
                "files": sorted(m.path for m in members),
            }
        )

    lines.append("")
    lines.append("## Notes")
    lines.append("- Split by intent boundary first, then by file grouping.")
    lines.append("- Use `git add -p` when one file contains mixed intents.")

    write_text(session_dir / "split-inventory.md", "\n".join(lines) + "\n")
    write_text(session_dir / "split-inventory.json", json.dumps(serializable, indent=2) + "\n")
    print(f"wrote: {session_dir / 'split-inventory.md'}")
    return 0


def cmd_draft_message(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    ensure_git_repo(root)

    session_dir = Path(args.dir).resolve()
    if not session_dir.is_dir():
        raise SystemExit(f"error: session dir not found: {session_dir}")

    ctype = args.type.strip()
    scope = args.scope.strip()
    summary = args.summary.strip()
    if not ctype or not summary:
        raise SystemExit("error: --type and --summary are required")
    why_before = args.why_before.strip()
    why_change = args.why_change.strip()
    why_gain = args.why_gain.strip()
    if not why_before or not why_change or not why_gain:
        raise SystemExit("error: --why-before, --why-change, and --why-gain are required")

    goal_status = args.goal_status.strip()
    if goal_status not in {"complete", "partial", "in_progress", "blocked"}:
        raise SystemExit("error: --goal-status must be one of complete|partial|in_progress|blocked")

    driver = normalize_driver(args.driver) if args.driver.strip() else detect_default_driver(root)
    driver_meta = args.driver_meta.strip() or "none"
    ok, msg = parse_driver_name(driver)
    if not ok:
        raise SystemExit(f"error: {msg}")
    ok, msg = parse_driver_meta(driver_meta)
    if not ok:
        raise SystemExit(f"error: {msg}")
    if driver == "none" and driver_meta != "none":
        raise SystemExit("error: driver_meta must be 'none' when driver is 'none'")

    activity_brainstorm = normalize_activity(args.activity_brainstorm)
    activity_spec = normalize_activity(args.activity_spec)
    activity_skill = normalize_activity(args.activity_skill)
    activity_docs = normalize_activity(args.activity_docs)
    learnings = [item.strip() for item in args.learning if item.strip()]
    if not learnings:
        raise SystemExit("error: provide at least one --learning item (key experience or concrete case)")
    remaining_entries = [parse_remaining_entry(raw) for raw in args.remaining_item]

    modules = [parse_module_entry(raw, fallback_scope=scope) for raw in args.module]
    if not modules:
        modules = [
            ModuleEntry(
                name=scope or "core",
                scope=scope or "core",
                summary="summarize changed behavior and intent",
                refs="README.md:1",
            )
        ]

    subject = f"{ctype}({scope}): {summary}" if scope else f"{ctype}: {summary}"

    meta: dict[str, str] = {
        "schema": FRONTMATTER_SCHEMA,
        "kind": COMMIT_SPEC_KIND,
        "generated_at": utc_now_iso(),
        "session": session_dir.name,
        "goal_target": args.goal_target.strip() or summary,
        "goal_status": goal_status,
        "goal_completion": args.goal_completion.strip() or "capture done scope and remaining work explicitly",
        "driver": driver,
        "driver_meta": driver_meta,
        "activity_brainstorm": activity_brainstorm,
        "activity_spec": activity_spec,
        "activity_skill": activity_skill,
        "activity_docs": activity_docs,
        "module_count": str(len(modules)),
    }

    lines = [subject, ""]
    lines.extend(render_frontmatter(meta))

    lines.extend(
        render_simple_section(
            "Purpose",
            args.purpose,
            "state why this commit exists and what engineering clarity it improves",
        )
    )
    lines.extend(render_why_section(why_before, why_change, why_gain))

    lines.append("## Goal Status")
    lines.append(f"- Target: {meta['goal_target']}")
    lines.append(f"- Status: {goal_status}")
    lines.append(f"- Completion: {meta['goal_completion']}")
    lines.append("")

    lines.extend(render_module_section(modules))
    lines.extend(render_simple_section("Learnings and Cases", learnings, "state one concrete case or insight"))

    lines.extend(render_simple_section("Validation", args.check, "add at least one command or evidence item"))

    lines.append("## Driver Context")
    lines.append(f"- Driver: {driver}")
    lines.append(f"- Driver-Meta: {driver_meta}")
    lines.append("")

    lines.append("## Knowledge Activities")
    lines.append(f"- Brainstorm: {activity_brainstorm}")
    lines.append(f"- Spec: {activity_spec}")
    lines.append(f"- Skill: {activity_skill}")
    lines.append(f"- Docs: {activity_docs}")
    lines.append("")
    lines.extend(render_remaining_section(remaining_entries))

    if args.risk:
        lines.extend(render_simple_section("Risk", args.risk, "state side effects and blast radius"))
    if args.rollback:
        lines.extend(render_simple_section("Rollback", args.rollback, "state how to revert safely"))
    if args.follow_up:
        lines.extend(render_simple_section("Follow-ups", args.follow_up, "state remaining actions"))

    trailers = list(args.trailer)
    spec_id = session_dir.name
    if not any(t.lower().startswith("spec-id:") for t in trailers):
        trailers.append(f"Spec-ID: {spec_id}")

    if args.ref:
        for ref in args.ref:
            trailers.append(f"Refs: {ref}")

    if trailers:
        lines.append("")
        lines.extend(trailers)

    default_name = f"draft-{ctype}-{slugify(scope or 'general')}.txt"
    output = Path(args.output).resolve() if args.output else session_dir / default_name
    write_text(output, "\n".join(lines).rstrip() + "\n")
    print(f"wrote: {output}")
    return 0


def cmd_lint_message(args: argparse.Namespace) -> int:
    path = Path(args.message).resolve()
    if not path.is_file():
        raise SystemExit(f"error: message file not found: {path}")

    text = read_text(path)
    lines = text.splitlines()
    if not lines:
        raise SystemExit("error: message file is empty")

    errors: list[str] = []
    subject = lines[0].strip()
    if not subject:
        errors.append("subject line is empty")
    if len(subject) > args.max_subject:
        errors.append(f"subject exceeds {args.max_subject} chars")
    if subject and not SUBJECT_RE.match(subject):
        errors.append("subject must match '<type>(<scope>): <summary>' or '<type>: <summary>'")

    meta, body, parse_errors = parse_frontmatter_from_message(text)
    errors.extend(parse_errors)

    if len(lines) < args.min_lines:
        errors.append(f"message must be at least {args.min_lines} lines to avoid one-line commit")

    required_meta = [
        "schema",
        "kind",
        "generated_at",
        "session",
        "goal_target",
        "goal_status",
        "goal_completion",
        "driver",
        "driver_meta",
        "activity_brainstorm",
        "activity_spec",
        "activity_skill",
        "activity_docs",
        "module_count",
    ]
    for key in required_meta:
        value = meta.get(key, "").strip()
        if not value:
            errors.append(f"missing required frontmatter key: {key}")

    if meta.get("schema") != FRONTMATTER_SCHEMA:
        errors.append(f"schema must be {FRONTMATTER_SCHEMA}")
    if meta.get("kind") != COMMIT_SPEC_KIND:
        errors.append(f"kind must be {COMMIT_SPEC_KIND}")

    generated_at = meta.get("generated_at", "")
    if generated_at and not UTC_TIMESTAMP_RE.match(generated_at):
        errors.append("generated_at must be ISO-8601 UTC, for example 2026-02-21T10:00:00Z")

    session = meta.get("session", "")
    if session and not SESSION_RE.match(session):
        errors.append("session must match '<YYYY-MM-DD>-<slug>'")

    if meta.get("goal_status") not in {"complete", "partial", "in_progress", "blocked"}:
        errors.append("goal_status must be one of complete|partial|in_progress|blocked")

    driver = normalize_driver(meta.get("driver", ""))
    ok, msg = parse_driver_name(driver)
    if not ok:
        errors.append(msg)
    driver_meta = meta.get("driver_meta", "").strip()
    ok, msg = parse_driver_meta(driver_meta)
    if not ok:
        errors.append(msg)
    if driver == "none" and driver_meta != "none":
        errors.append("driver_meta must be 'none' when driver is 'none'")

    for activity_key in ("activity_brainstorm", "activity_spec", "activity_skill", "activity_docs"):
        value = meta.get(activity_key, "").strip()
        if not value:
            errors.append(f"{activity_key} must not be empty")

    if "<" in body and ">" in body:
        errors.append("body still contains placeholder tokens")

    required_headings = [
        "Purpose",
        "Why This Change",
        "Goal Status",
        "Changes by Module",
        "Learnings and Cases",
        "Validation",
        "Driver Context",
        "Knowledge Activities",
        "Remaining Work",
    ]
    for heading in required_headings:
        if f"## {heading}" not in body:
            errors.append(f"missing required GFM heading: ## {heading}")

    why_section = extract_section(body, "Why This Change")
    if not re.search(r"(?m)^- Before: .+\S$", why_section):
        errors.append("Why This Change must include '- Before: <pre-change state and context>'")
    if not re.search(r"(?m)^- Change: .+\S$", why_section):
        errors.append("Why This Change must include '- Change: <what changed in this commit>'")
    if not re.search(r"(?m)^- Gain: .+\S$", why_section):
        errors.append("Why This Change must include '- Gain: <incremental gain/benefit>'")

    goal_section = extract_section(body, "Goal Status")
    if not re.search(r"(?m)^- Status: (complete|partial|in_progress|blocked)$", goal_section):
        errors.append("Goal Status section must include '- Status: complete|partial|in_progress|blocked'")

    changes_section = extract_section(body, "Changes by Module")
    module_entries = re.findall(r"(?m)^- \*\*.+\*\*", changes_section)
    if not module_entries:
        errors.append("Changes by Module must include at least one module bullet")
    if "Key refs:" not in changes_section:
        errors.append("Changes by Module must include 'Key refs:'")

    module_count = meta.get("module_count", "")
    if module_count:
        if not module_count.isdigit():
            errors.append("module_count must be an integer string")
        else:
            expected_module_count = int(module_count)
            if expected_module_count < 1:
                errors.append("module_count must be >= 1")
            elif expected_module_count != len(module_entries):
                errors.append(
                    f"module_count mismatch: frontmatter={expected_module_count}, body={len(module_entries)}"
                )

    validation_section = extract_section(body, "Validation")
    if not re.search(r"(?m)^- ", validation_section):
        errors.append("Validation section must include at least one bullet")

    learnings_section = extract_section(body, "Learnings and Cases")
    if not re.search(r"(?m)^- ", learnings_section):
        errors.append("Learnings and Cases section must include at least one bullet")

    driver_section = extract_section(body, "Driver Context")
    if not re.search(r"(?m)^- Driver:", driver_section):
        errors.append("Driver Context must include Driver line")
    if not re.search(r"(?m)^- Driver-Meta:", driver_section):
        errors.append("Driver Context must include Driver-Meta line")

    activity_section = extract_section(body, "Knowledge Activities")
    if not re.search(r"(?m)^- Brainstorm:", activity_section):
        errors.append("Knowledge Activities must include Brainstorm line")
    if not re.search(r"(?m)^- Spec:", activity_section):
        errors.append("Knowledge Activities must include Spec line")
    if not re.search(r"(?m)^- Skill:", activity_section):
        errors.append("Knowledge Activities must include Skill line")
    if not re.search(r"(?m)^- Docs:", activity_section):
        errors.append("Knowledge Activities must include Docs line")

    remaining_section = extract_section(body, "Remaining Work")
    if re.search(r"(?m)^- None$", remaining_section):
        pass
    else:
        what_lines = re.findall(r"(?m)^- What: .+\S$", remaining_section)
        why_lines = re.findall(r"(?m)^- Why Pending: .+\S$", remaining_section)
        plan_lines = re.findall(r"(?m)^- Plan: .+\S$", remaining_section)
        if not what_lines:
            errors.append("Remaining Work must include '- None' or at least one '- What: ...' item")
        if len(what_lines) != len(why_lines) or len(what_lines) != len(plan_lines):
            errors.append(
                "Remaining Work items must follow template: "
                "'- What: ...' + '- Why Pending: ...' + '- Plan: ...'"
            )

    if errors:
        for err in errors:
            print(f"error: {err}", file=sys.stderr)
        return 1

    print("ok: commit message lint passed")
    return 0


def cmd_archive(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    ensure_git_repo(root)

    session_dir = Path(args.dir).resolve()
    if not session_dir.is_dir():
        raise SystemExit(f"error: session dir not found: {session_dir}")

    action_dest = args.action_dest.strip()
    memory_dest = args.memory_dest.strip()
    if not action_dest:
        raise SystemExit("error: --action-dest is required")

    if memory_dest.lower() == "none":
        if not args.memory_none_reason.strip():
            raise SystemExit("error: --memory-none-reason is required when --memory-dest none")
        memory_line = f"none ({args.memory_none_reason.strip()})"
    else:
        memory_line = memory_dest

    commits: list[str] = []
    for raw_commit in args.commit:
        commit = raw_commit.strip()
        if not commit:
            continue
        if not COMMIT_SHA_RE.match(commit):
            raise SystemExit(f"error: invalid commit hash: {commit}")
        try:
            run_git(root, ["rev-parse", "--verify", f"{commit}^{{commit}}"])
        except SystemExit as exc:
            raise SystemExit(f"error: commit not found: {commit}") from exc
        if commit not in commits:
            commits.append(commit)

    if not commits:
        raise SystemExit("error: provide at least one --commit as archive evidence")

    checks = [item.strip() for item in args.check_evidence if item.strip()]
    if not checks:
        raise SystemExit("error: provide at least one --check-evidence item")

    archive_path = Path(args.archive_path).resolve() if args.archive_path else session_dir / "archive.md"

    lines = [
        "# Commit Session Archive",
        "",
        "Status: complete",
        f"- updated_at: {utc_now_iso()}",
        f"- action_handoff: {action_dest}",
        f"- memory_handoff: {memory_line}",
        f"- archive: {rel(root, archive_path)}",
        "",
        "## Commit Evidence",
    ]
    lines.extend(f"- {commit}" for commit in commits)
    lines.extend(
        [
            "",
            "## Check Evidence",
        ]
    )
    lines.extend(f"- {check}" for check in checks)

    write_text(archive_path, "\n".join(lines) + "\n")
    print(f"wrote: {archive_path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="initialize commit session artifacts")
    p_init.add_argument("--root", default=".", help="git repo root")
    p_init.add_argument("--topic", required=True, help="session topic")
    p_init.add_argument("--force", action="store_true", help="overwrite existing session directory")
    p_init.add_argument(
        "--session-artifacts",
        default=SESSION_ARTIFACTS_LOCAL,
        choices=[SESSION_ARTIFACTS_LOCAL, SESSION_ARTIFACTS_TRACKED],
        help="local creates .bagakit/commit-spec/.gitignore; tracked keeps session artifacts visible to git",
    )
    p_init.add_argument(
        "--install-hooks",
        default="ask",
        choices=["ask", "yes", "no"],
        help="commit-msg hook install mode during init",
    )
    p_init.add_argument("--force-hooks", action="store_true", help="replace existing non-bagakit hook")
    p_init.set_defaults(func=cmd_init)

    p_hook = sub.add_parser("install-hooks", help="install commit-msg hook template into current repo")
    p_hook.add_argument("--root", default=".", help="git repo root")
    p_hook.add_argument("--force", action="store_true", help="replace existing non-bagakit hook")
    p_hook.set_defaults(func=cmd_install_hooks)

    p_inv = sub.add_parser("inventory", help="generate split inventory from working tree")
    p_inv.add_argument("--root", default=".", help="git repo root")
    p_inv.add_argument("--dir", required=True, help="session artifact directory")
    p_inv.add_argument("--staged-only", action="store_true", help="inspect staged files only")
    p_inv.set_defaults(func=cmd_inventory)

    p_msg = sub.add_parser("draft-message", help="draft a GFM spec-style commit message with TOML frontmatter")
    p_msg.add_argument("--root", default=".", help="git repo root")
    p_msg.add_argument("--dir", required=True, help="session artifact directory")
    p_msg.add_argument("--type", required=True, help="commit type (feat/fix/refactor/docs/test/chore)")
    p_msg.add_argument("--scope", default="", help="commit scope")
    p_msg.add_argument("--summary", required=True, help="short subject summary")
    p_msg.add_argument("--purpose", action="append", default=[], help="purpose bullet item")
    p_msg.add_argument("--why-before", required=True, help="pre-change state and why change was needed")
    p_msg.add_argument("--why-change", required=True, help="what changed in this commit")
    p_msg.add_argument("--why-gain", required=True, help="what gain/benefit this commit brings")
    p_msg.add_argument("--goal-target", default="", help="target objective this commit serves")
    p_msg.add_argument(
        "--goal-status",
        default="partial",
        help="goal completion status: complete|partial|in_progress|blocked",
    )
    p_msg.add_argument("--goal-completion", default="", help="completion detail (done vs remaining)")
    p_msg.add_argument(
        "--module",
        action="append",
        default=[],
        help="module entry in format 'name|scope|summary|key refs'",
    )
    p_msg.add_argument("--check", action="append", default=[], help="validation evidence bullet")
    p_msg.add_argument(
        "--driver",
        default="",
        help="workflow driver token (for example ftharness/openspec/longrun) or 'none'",
    )
    p_msg.add_argument(
        "--driver-meta",
        default="",
        help="driver metadata in key=value pairs separated by ';' or 'none'",
    )
    p_msg.add_argument("--activity-brainstorm", default="none", help="brainstorm activity summary")
    p_msg.add_argument("--activity-spec", default="none", help="spec activity summary")
    p_msg.add_argument("--activity-skill", default="none", help="skill activity summary")
    p_msg.add_argument("--activity-docs", default="none", help="docs activity summary")
    p_msg.add_argument("--learning", action="append", default=[], help="one key learning/concrete case bullet")
    p_msg.add_argument(
        "--remaining-item",
        action="append",
        default=[],
        help="remaining item format '<what>|<why pending>|<plan>' (repeatable)",
    )
    p_msg.add_argument("--risk", action="append", default=[], help="risk bullet")
    p_msg.add_argument("--rollback", action="append", default=[], help="rollback bullet")
    p_msg.add_argument("--follow-up", action="append", default=[], help="legacy follow-up bullet (optional)")
    p_msg.add_argument("--ref", action="append", default=[], help="reference id/url")
    p_msg.add_argument("--trailer", action="append", default=[], help="raw trailer line")
    p_msg.add_argument("--output", default="", help="output commit message path")
    p_msg.set_defaults(func=cmd_draft_message)

    p_lint = sub.add_parser("lint-message", help="lint commit message hard invariants")
    p_lint.add_argument("--message", required=True, help="commit message file")
    p_lint.add_argument("--max-subject", type=int, default=72, help="subject length limit")
    p_lint.add_argument("--min-lines", type=int, default=16, help="minimum message lines")
    p_lint.set_defaults(func=cmd_lint_message)

    p_arc = sub.add_parser("archive", help="write completion archive record")
    p_arc.add_argument("--root", default=".", help="git repo root")
    p_arc.add_argument("--dir", required=True, help="session artifact directory")
    p_arc.add_argument("--action-dest", required=True, help="action handoff destination")
    p_arc.add_argument("--memory-dest", required=True, help="memory handoff destination or none")
    p_arc.add_argument("--memory-none-reason", default="", help="required when memory-dest=none")
    p_arc.add_argument("--commit", action="append", default=[], help="commit hash evidence (required, repeatable)")
    p_arc.add_argument(
        "--check-evidence",
        action="append",
        default=[],
        help="check/validation evidence (required, repeatable)",
    )
    p_arc.add_argument("--archive-path", default="", help="custom archive file path")
    p_arc.set_defaults(func=cmd_archive)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
