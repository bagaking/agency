#!/usr/bin/env python3
"""Scaffold and validate portable skills with Bagakit-friendly defaults."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
PLACEHOLDER_HINTS = ("TODO", "[TODO", "replace")
MAX_SKILL_LINES = 500
FILE_STEM_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
GENERIC_FILE_STEMS = {"helper", "helpers", "misc", "tmp", "temp", "util", "utils", "test", "tests"}
LEGACY_TERMS = {"legacy", "compat", "deprecated", "workaround", "shim", "backward", "old"}
OPTIONAL_HINTS = (
    "optional",
    "if available",
    "if installed",
    "contract",
    "schema",
    "signal",
    "可选",
    "契约",
    "信号",
)
COUPLING_HINTS = (
    "must",
    "require",
    "required",
    "depends",
    "dependency",
    "before",
    "call",
    "invoke",
    "run",
    "execute",
    "bash",
    "sh ",
    "python",
    "node",
)
NON_SKILL_BAGAKIT_TOKENS = {
    "bagakit-series",
    "bagakit-profile",
    "bagakit-profile-guide",
    "bagakit-home",
}
ACTION_HINTS = ("action", "execute", "execution", "task", "交付", "执行", "推进")
MEMORY_HINTS = ("memory", "summary", "knowledge", "inbox", "沉淀", "记忆", "总结")
ARCHIVE_HINTS = ("archive", "destination", "path", "id", "归档", "去向")
ADAPTER_HINTS = (
    "adapter",
    "integration",
    "connector",
    "bridge",
    "external",
    "upstream",
    "downstream",
    "route",
    "system",
    "联动",
)
GENERIC_ADAPTER_HINTS = (
    "task driver",
    "task-driver",
    "spec system",
    "spec-system",
    "memory system",
    "memory-system",
    "adapter class",
    "capability",
    "contract-driven",
    "rule-driven",
    "name-bound",
    "系统无关",
    "能力",
    "契约",
)
CONCRETE_ADAPTER_HINTS = (
    "feat-harness",
    "feat-task-harness",
    "openspec",
    "living-docs",
)
NO_ADAPTER_HINTS = (
    "no adapter",
    "no external",
    "standalone-only",
    "standalone first",
    "none",
    "无需联动",
    "无联动",
    "仅本地",
)
ALLOWED_SCRIPT_EXTENSIONS = {".sh", ".py", ".js", ".ts"}
ALLOWED_REFERENCE_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml"}
ABSOLUTE_PATH_SCAN_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml"}
ABSOLUTE_POSIX_RE = re.compile(
    r"(?<![:A-Za-z0-9_])/(?:Users|home|private|var|tmp|opt|usr|etc|mnt|Volumes|absolute)(?:/[^\s\"'`<>|]+)+"
)
ABSOLUTE_WINDOWS_RE = re.compile(r"(?i)\b[A-Z]:[\\/][^\s\"'`<>|]+")
DISCOURAGED_ADAPTER_KEYS = ("driver_ftharness", "driver_openspec", "driver_longrun")
ANTI_PATTERN_HINTS = ("avoid", "bad pattern", "anti-pattern", "instead of", "不要", "避免", "禁用")


def eprint(*items: object) -> None:
    print(*items, file=sys.stderr)


def normalize_name(raw: str) -> str:
    name = re.sub(r"[^a-z0-9]+", "-", raw.strip().lower())
    name = re.sub(r"-{2,}", "-", name).strip("-")
    if not name:
        raise SystemExit("error: normalized skill name is empty")
    if not NAME_RE.match(name):
        raise SystemExit(
            "error: invalid skill name after normalization; use lowercase letters, digits, hyphens; max 64 chars"
        )
    return name


def title_case(name: str) -> str:
    return " ".join(part.capitalize() for part in name.split("-"))


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_skill_md(name: str) -> str:
    title = title_case(name)
    return f"""---
name: {name}
description: TODO: describe what this skill does and exactly when to use it.
---

# {title}

## Purpose

- Keep this skill focused on one coherent operational job.
- Put "when to use" trigger details in frontmatter `description`.
- Keep the skill standalone-first.
- Generated files should avoid absolute paths; use relative paths or env variables.

## When to Use This Skill

- User asks to create or refactor a skill with a clear operational boundary.
- User needs stricter trigger wording, payload hygiene, or optional contract rules.
- User wants split/merge recommendations backed by validation checks.

## When NOT to Use This Skill

- User only needs one-off coding help and does not need a reusable skill.
- User asks for hard coupling to another skill flow as a mandatory dependency.
- User asks for broad toolbox behavior without a clear scope boundary.

## Decision Categories

| Category | Symptom | Action |
| --- | --- | --- |
| Trigger boundary | Over-trigger/under-trigger | tighten frontmatter + positive/negative examples |
| Granularity | Scope drift across unrelated tasks | split or merge with explicit validation matrix |
| Contract | Direct flow-calls to other skills | switch to optional rule/schema signal contract |
| Metadata contract | one key per adapter/system; hard-coded workflow fields | use semantic generic keys + parseable `*_meta`; prefer TOML frontmatter in machine-readable artifacts |
| Payload | Runtime/dev files mixed | trim `SKILL_PAYLOAD.json` to runtime-only files |
| Path portability | Generated docs/config contain local absolute paths | rewrite to relative/env-based paths |
| Output/archive | Outputs exist without clear destination or completion gate | define default route + optional adapters + archive handoff |

## Workflow

1. Capture concrete triggering and non-triggering examples.
2. Keep SKILL.md concise; move deep material to references.
3. Put deterministic/fragile repeatable steps into scripts.
4. Validate and iterate based on over-trigger/under-trigger behavior.

## Quality Validation Strategy

- Qualitative quality (for example clarification depth, discussion rigor, writing quality) should be defined as prompt rubrics/checklists and reviewed by a coding agent/human.
- Script checks should validate objective invariants only (format, required sections, output destinations, path/runtime contracts).

## Cross-Skill Contract

- Cross-skill interaction must stay optional.
- Exchange only schema/contract signals; never hard-call another skill flow.

## Metadata Contract Principle

- Prefer semantic generic keys over workflow-specific key proliferation.
- Avoid patterns like `driver_ftharness` / `driver_openspec` / `driver_longrun`.
- Prefer `driver` + `driver_meta` when driver context needs machine-readable representation.
- Keep driver values semantic (for example `none` / `task-driver` / `spec-system` / `memory-system` / `custom`).
- For machine-readable metadata blocks in Markdown artifacts, prefer TOML frontmatter (`+++`).
- Keep SKILL.md header/frontmatter in YAML unless runtime requirements explicitly change.

## Output Routes and Default Mode

- Classify this skill's deliverable archetype (execution-heavy / process-driver / memory-governance).
- Define explicit outputs:
  - `action-handoff`: what should be executed, with default route + optional adapters.
  - `memory-handoff`: what should be retained, with default route + optional adapters (or explicit `none` rationale).
  - `archive`: where closure evidence is written.
- Define default output route when no external driver is usable (not detected / unresolved / invalid contract).
- Define optional adapter routes for external systems (for example task driver / spec system / memory system), or explicitly state `standalone-only/no-adapter`.
- If needed, add a Bagakit profile section that maps to concrete systems as optional examples.
- Keep route selection capability/contract-driven and fallback-safe; avoid name-bound checks like `feat-harness`/`openspec` in core logic.

## Archive Gate (Completion Handoff)

- Every output must have a resolved destination path or id.
- Archive must report action handoff destination + memory handoff destination (or explicit `none` rationale).
- If adapter routes are unavailable, archive must still capture default local destinations.
- Do not mark complete until action/memory/archive destinations are all explicit.

## Fallback Path (No Clear Fit)

- If scope is still ambiguous, ask one clarifying question on boundaries.
- If no reusable skill pattern is found, execute task directly and record why no skill route is used.
- If the request conflicts with standalone-first rules, provide a compliant alternative.

## Response Templates

### Create

```text
Result: created <skill-name> with clear trigger boundary.
Checks: validate pass + payload gate pass + output/archive gate pass.
Next: run one positive and one negative trigger scenario.
```

### Improve

```text
Result: improved existing skill by narrowing trigger scope and reducing ambiguity.
Checks: before/after trigger matrix + validate pass + output/archive map verified.
Next: observe one production round and collect misses.
```

### Merge

```text
Result: merged overlapping skills into one coherent scope and contract.
Checks: merge map + de-dup rationale + validate pass + archive handoff path verified.
Next: run post-merge trigger matrix and adjust boundaries.
```

### No Clear Skill Fit

```text
Result: no stable reusable pattern identified yet.
Checks: documented fallback reason + standalone constraints reviewed.
Next: complete task directly and collect examples for future skill design.
```

## `[[BAGAKIT]]` Footer

```text
[[BAGAKIT]]
- Skill: Status=<in_progress|done|blocked>; Evidence=<checks>; Next=<next action>
```
"""


def build_openai_yaml(name: str) -> str:
    display = title_case(name)
    return (
        "interface:\n"
        f"  display_name: \"{display}\"\n"
        "  short_description: \"TODO: short UI summary\"\n"
        "  default_prompt: \"TODO: one-line default instruction\"\n"
    )


def cmd_init(args: argparse.Namespace) -> int:
    name = normalize_name(args.name)
    root = Path(args.path).expanduser().resolve()
    skill_dir = root / name
    if skill_dir.exists():
        eprint(f"error: target directory already exists: {skill_dir}")
        return 1

    includes = ["SKILL.md", "references", "scripts"]
    if args.with_agents:
        includes.append("agents")

    skill_dir.mkdir(parents=True, exist_ok=False)
    (skill_dir / "references").mkdir(parents=True, exist_ok=True)
    (skill_dir / "scripts").mkdir(parents=True, exist_ok=True)

    write_text(skill_dir / "SKILL.md", build_skill_md(name))
    write_text(
        skill_dir / "SKILL_PAYLOAD.json",
        json.dumps({"version": 1, "include": includes}, indent=2, ensure_ascii=False) + "\n",
    )
    write_text(
        skill_dir / "references" / "start-here.md",
        "# Start Here\n\nAdd reference docs that are too detailed for SKILL.md.\n",
    )

    if args.with_agents:
        write_text(skill_dir / "agents" / "openai.yaml", build_openai_yaml(name))

    print(f"created: {skill_dir}")
    print("next:")
    print(f"  1) edit {skill_dir / 'SKILL.md'}")
    print(f"  2) run: {Path(__file__).name} validate --skill-dir {skill_dir}")
    return 0


def parse_frontmatter(text: str) -> tuple[dict[str, str], list[str]]:
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return {}, ["SKILL.md must start with YAML frontmatter ('---'); TOML frontmatter guidance applies to artifact metadata blocks"]
    try:
        end = lines.index("---", 1)
    except ValueError:
        return {}, ["SKILL.md frontmatter is not closed with '---'"]

    kv: dict[str, str] = {}
    errors: list[str] = []
    for raw in lines[1:end]:
        line = raw.strip()
        if not line:
            continue
        if ":" not in line:
            errors.append(f"invalid frontmatter line: {raw}")
            continue
        key, value = line.split(":", 1)
        kv[key.strip()] = value.strip().strip('"').strip("'")
    return kv, errors


def load_payload(path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, [f"missing file: {path}"]
    except json.JSONDecodeError as exc:
        return None, [f"invalid json in {path}: {exc}"]
    if not isinstance(data, dict):
        return None, [f"payload root must be object: {path}"]
    return data, []


def line_is_optional_contract(line: str) -> bool:
    lower = line.lower()
    return any(hint in lower for hint in OPTIONAL_HINTS)


def section_has_bullets(skill_text: str, heading_re: str, min_count: int = 1) -> bool:
    block = section_block(skill_text, heading_re)
    if block is None:
        return False
    bullets = re.findall(r"(?m)^\s*[-*]\s+\S", block)
    return len(bullets) >= min_count


def section_block(skill_text: str, heading_re: str) -> str | None:
    match = re.search(heading_re, skill_text, flags=re.IGNORECASE | re.MULTILINE)
    if not match:
        return None
    tail = skill_text[match.end() :]
    next_heading = re.search(r"(?m)^##\s+", tail)
    return tail[: next_heading.start()] if next_heading else tail


def scan_hard_coupling(skill_text: str, own_name: str) -> list[str]:
    errors: list[str] = []
    for idx, line in enumerate(skill_text.splitlines(), 1):
        lower = line.lower()
        for token in re.findall(r"\bbagakit-[a-z0-9-]+\b", lower):
            if token == own_name:
                continue
            if token in NON_SKILL_BAGAKIT_TOKENS:
                continue
            if not any(hint in lower for hint in COUPLING_HINTS):
                continue
            if not line_is_optional_contract(lower):
                errors.append(
                    f"line {idx}: cross-skill reference '{token}' must be optional and contract/signal based"
                )

        direct_skill_match = re.search(r"/skills/([a-z0-9-]+)", lower)
        if direct_skill_match and re.search(r"\b(bash|sh|python3?|node)\b", lower):
            target_skill = direct_skill_match.group(1)
            if target_skill != own_name and not line_is_optional_contract(lower):
                errors.append(
                    f"line {idx}: direct call to other skill '{target_skill}' is not allowed without optional contract wording"
                )
    return errors


def scan_metadata_contract_signals(skill_text: str) -> list[str]:
    warnings: list[str] = []
    lower = skill_text.lower()

    found_discouraged: list[str] = []
    for line in skill_text.splitlines():
        line_lower = line.lower()
        if any(hint in line_lower for hint in ANTI_PATTERN_HINTS):
            continue
        for key in DISCOURAGED_ADAPTER_KEYS:
            if key in line_lower:
                found_discouraged.append(key)

    unique_discouraged = sorted(set(found_discouraged))
    if unique_discouraged:
        warnings.append(
            "metadata contract may be over-coupled: found adapter-specific keys "
            f"{', '.join(unique_discouraged)}; prefer semantic keys like driver + driver_meta"
        )
        if "driver_meta" not in lower or "driver" not in lower:
            warnings.append("metadata contract should document semantic generic key + parseable meta pattern")

    if "machine-readable" in lower and "frontmatter" in lower and "toml" not in lower:
        warnings.append(
            "machine-readable frontmatter detected without TOML wording; prefer TOML frontmatter (`+++`) in artifacts"
        )

    return warnings


def audit_runtime_files(skill_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    runtime_dirs = {
        "scripts": ALLOWED_SCRIPT_EXTENSIONS,
        "references": ALLOWED_REFERENCE_EXTENSIONS,
    }

    for dirname, allowed_ext in runtime_dirs.items():
        root = skill_dir / dirname
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(skill_dir)
            stem = path.stem.lower()
            suffix = path.suffix.lower()
            if suffix and suffix not in allowed_ext:
                warnings.append(f"unexpected extension under {dirname}: {rel}")

            if not FILE_STEM_RE.match(stem):
                errors.append(f"file name must be lowercase/digits/hyphen/underscore only: {rel}")

            if stem in GENERIC_FILE_STEMS:
                errors.append(f"file name is too generic (not self-explanatory): {rel}")

            tokens = [tok for tok in re.split(r"[-_]+", stem) if tok]
            bad_terms = sorted(set(tok for tok in tokens if tok in LEGACY_TERMS))
            if bad_terms:
                errors.append(
                    f"file name contains legacy/workaround term {bad_terms}; rewrite to final-state naming: {rel}"
                )

            if "_" in path.name:
                warnings.append(f"prefer hyphen-case file naming for clarity: {rel}")

    return errors, warnings


def scan_absolute_path_literals(skill_dir: Path, include: list[str]) -> list[str]:
    targets: set[Path] = set()

    def add_target(path: Path) -> None:
        if path.name == "SKILL.md" or path.suffix.lower() in ABSOLUTE_PATH_SCAN_EXTENSIONS:
            targets.add(path)

    # Always scan SKILL.md, then scan payload/runtime text files.
    add_target(skill_dir / "SKILL.md")
    scan_roots = include[:] if include else ["references", "agents"]

    for rel in scan_roots:
        path = skill_dir / rel
        if not path.exists():
            continue
        if path.is_file():
            add_target(path)
            continue
        for child in sorted(path.rglob("*")):
            if child.is_file():
                add_target(child)

    errors: list[str] = []
    for path in sorted(targets):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        rel = path.relative_to(skill_dir).as_posix()
        for idx, line in enumerate(text.splitlines(), 1):
            if ABSOLUTE_POSIX_RE.search(line) or ABSOLUTE_WINDOWS_RE.search(line):
                errors.append(
                    f"{rel}:{idx} contains absolute path literal; use relative paths or env variables in generated files"
                )
    return errors


def cmd_validate(args: argparse.Namespace) -> int:
    skill_dir = Path(args.skill_dir).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    skill_md = skill_dir / "SKILL.md"
    payload_file = skill_dir / "SKILL_PAYLOAD.json"
    if not skill_md.exists():
        errors.append(f"missing file: {skill_md}")
    if not payload_file.exists():
        errors.append(f"missing file: {payload_file}")
    if errors:
        for err in errors:
            eprint(f"error: {err}")
        return 1

    skill_text = skill_md.read_text(encoding="utf-8")
    fm, fm_errors = parse_frontmatter(skill_text)
    errors.extend(fm_errors)
    allowed_keys = {"name", "description"}
    unknown = sorted(set(fm.keys()) - allowed_keys)
    if unknown:
        errors.append(f"frontmatter has unsupported keys: {', '.join(unknown)}")

    name = fm.get("name", "")
    description = fm.get("description", "")
    if not name:
        errors.append("frontmatter missing required key: name")
    elif not NAME_RE.match(name):
        errors.append("frontmatter name is invalid; expected lowercase letters/digits/hyphens, max 64 chars")
    if not description:
        errors.append("frontmatter missing required key: description")
    elif any(hint in description for hint in PLACEHOLDER_HINTS):
        errors.append("frontmatter description still looks like placeholder text")
    elif not re.search(r"\bwhen\b|适用|当|用于", description.lower()):
        errors.append("frontmatter description should include clear trigger wording (e.g. 'use when ...')")
    if description and len(description) < 40:
        warnings.append("frontmatter description may be too short for accurate triggering")

    payload, payload_errors = load_payload(payload_file)
    errors.extend(payload_errors)
    include: list[str] = []
    if payload is not None:
        raw_include = payload.get("include")
        if not isinstance(raw_include, list) or not all(isinstance(item, str) for item in raw_include):
            errors.append("SKILL_PAYLOAD.json include must be an array of strings")
        else:
            include = raw_include

    if include:
        include_set = set(include)
        if len(include_set) != len(include):
            errors.append("SKILL_PAYLOAD.json include contains duplicate items")
        if "SKILL.md" not in include_set:
            errors.append("SKILL_PAYLOAD.json include must contain SKILL.md")
        if "README.md" in include_set:
            errors.append("SKILL_PAYLOAD.json include must not contain README.md")
        for path in include:
            if path.startswith("/") or ".." in Path(path).parts:
                errors.append(f"payload path must stay inside skill directory: {path}")
                continue
            if not (skill_dir / path).exists():
                errors.append(f"payload path missing on disk: {path}")
        for runtime_dir in ("scripts", "references", "agents"):
            exists = (skill_dir / runtime_dir).exists()
            has = runtime_dir in include_set
            if exists and not has:
                warnings.append(f"directory exists but not included in payload: {runtime_dir}")
            if has and not exists:
                errors.append(f"payload includes missing directory: {runtime_dir}")

    lines = skill_text.splitlines()
    if len(lines) > MAX_SKILL_LINES:
        errors.append(f"SKILL.md must stay within {MAX_SKILL_LINES} lines (current={len(lines)})")

    is_bagakit_series = bool(name) and name.startswith("bagakit-")
    has_bagakit_anchor = bool(re.search(r"(?m)^\[\[BAGAKIT\]\]\s*$", skill_text))
    has_bagakit_peer_lines = bool(re.search(r"(?m)^\[\[BAGAKIT\]\]\s*\n(?:- .+\n)+", skill_text))
    if not has_bagakit_anchor:
        if is_bagakit_series:
            errors.append("SKILL.md must define [[BAGAKIT]] footer contract for bagakit-* skills")
        else:
            warnings.append(
                "SKILL.md has no [[BAGAKIT]] footer contract; this is fine for generic mode, but required if Bagakit profile is enabled"
            )
    elif is_bagakit_series and not has_bagakit_peer_lines:
        errors.append("bagakit-* skills must keep canonical [[BAGAKIT]] format: anchor line followed by peer '- ...' lines")
    if "standalone" not in skill_text.lower():
        errors.append("SKILL.md must state standalone-first design explicitly")
    if not (
        "optional" in skill_text.lower()
        and any(key in skill_text.lower() for key in ("contract", "schema", "signal", "契约", "信号"))
    ):
        errors.append("SKILL.md must describe optional cross-skill contract/signal exchange")
    if "## Workflow" not in skill_text:
        errors.append("SKILL.md must include a '## Workflow' section")
    if not section_has_bullets(skill_text, r"^##\s+When to Use(?: This Skill)?\s*$", min_count=2):
        errors.append("SKILL.md must include '## When to Use' section with at least 2 bullet items")
    if not section_has_bullets(skill_text, r"^##\s+When NOT to Use(?: This Skill)?\s*$", min_count=2):
        errors.append("SKILL.md must include '## When NOT to Use' section with at least 2 bullet items")
    if not section_has_bullets(
        skill_text,
        r"^##\s+(?:Fallback Path(?:\s*\(.*\))?|When No Clear Fit(?:\s*\(.*\))?)\s*$",
        min_count=1,
    ):
        errors.append("SKILL.md must include a fallback section with at least 1 bullet action")
    if not section_has_bullets(
        skill_text,
        r"^##\s+(?:Output Routes(?: and Default Mode)?|Output Contract|Output System Contract)\s*$",
        min_count=2,
    ):
        errors.append("SKILL.md must include output routes/default section with at least 2 bullet items")
    if not section_has_bullets(
        skill_text,
        r"^##\s+(?:Archive Gate(?:\s*\(.*\))?|Completion Handoff(?: and Archive)?|Archive(?: and Handoff)?)\s*$",
        min_count=1,
    ):
        errors.append("SKILL.md must include archive gate/hand-off section with at least 1 bullet action")

    output_block = section_block(
        skill_text, r"^##\s+(?:Output Routes(?: and Default Mode)?|Output Contract|Output System Contract)\s*$"
    )
    output_lower = output_block.lower() if output_block else ""
    if output_block:
        if "default" not in output_lower:
            errors.append("output section must explicitly mention default route behavior")
        has_adapter_route = any(token in output_lower for token in ADAPTER_HINTS)
        has_no_adapter_policy = any(token in output_lower for token in NO_ADAPTER_HINTS)
        if not (has_adapter_route or has_no_adapter_policy):
            errors.append(
                "output section must declare adapter policy: optional adapter routes or explicit standalone/no-adapter statement"
            )
        if has_adapter_route and "optional" not in output_lower and "可选" not in output_lower:
            warnings.append("adapter routes should be marked optional to preserve standalone-first behavior")
        has_concrete_adapter_names = any(token in output_lower for token in CONCRETE_ADAPTER_HINTS)
        has_generic_adapter_terms = any(token in output_lower for token in GENERIC_ADAPTER_HINTS)
        if has_concrete_adapter_names and not has_generic_adapter_terms:
            warnings.append(
                "output routing appears concrete-name-bound; describe generic adapter classes/capability rules first, "
                "then map concrete systems as optional profile examples"
            )
        if "only when no" in output_lower and "detected" in output_lower:
            warnings.append(
                "fallback wording is too narrow; cover no external driver usable (not detected / unresolved / invalid contract)"
            )
        if not any(token in output_lower for token in ACTION_HINTS):
            errors.append("output section must define an action handoff output")
        has_memory = any(token in output_lower for token in MEMORY_HINTS)
        has_memory_none = any(token in output_lower for token in ("no memory", "none", "无沉淀", "无记忆", "无需沉淀"))
        if not (has_memory or has_memory_none):
            errors.append("output section must define a memory/summary handoff output (or explicit none rationale)")
        if not any(token in output_lower for token in ("archetype", "type", "分类", "类别", "产物")):
            warnings.append("output section should classify deliverable archetype/type")

    archive_block = section_block(
        skill_text, r"^##\s+(?:Archive Gate(?:\s*\(.*\))?|Completion Handoff(?: and Archive)?|Archive(?: and Handoff)?)\s*$"
    )
    archive_lower = archive_block.lower() if archive_block else ""
    if archive_block:
        if not any(token in archive_lower for token in ARCHIVE_HINTS):
            errors.append("archive section must explicitly include destination path/id evidence")
        if not any(token in archive_lower for token in ACTION_HINTS):
            errors.append("archive section must mention action handoff destination")
        has_archive_memory = any(token in archive_lower for token in MEMORY_HINTS)
        has_archive_memory_none = any(
            token in archive_lower for token in ("no memory", "none", "无沉淀", "无记忆", "无需沉淀")
        )
        if not (has_archive_memory or has_archive_memory_none):
            errors.append("archive section must mention memory handoff destination (or explicit none rationale)")
        if not any(token in archive_lower for token in ("complete", "completion", "gate", "准出", "完成")):
            warnings.append("archive section should state completion gate conditions explicitly")

    errors.extend(scan_hard_coupling(skill_text, name or ""))
    warnings.extend(scan_metadata_contract_signals(skill_text))
    runtime_errors, runtime_warnings = audit_runtime_files(skill_dir)
    errors.extend(runtime_errors)
    warnings.extend(runtime_warnings)
    errors.extend(scan_absolute_path_literals(skill_dir, include))

    if "bash .bagakit/" in skill_text:
        warnings.append(
            "SKILL.md contains direct '.bagakit' script call; ensure this is optional and not a hard dependency"
        )

    for warning in warnings:
        print(f"warn: {warning}")
    if errors:
        for err in errors:
            eprint(f"error: {err}")
        return 1

    print("ok: skill validation passed")
    if warnings:
        print(f"warn_count={len(warnings)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bagakit skill scaffolder and validator")
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="create a new skill skeleton")
    p_init.add_argument("--name", required=True, help="skill name (hyphen-case)")
    p_init.add_argument("--path", default=".", help="parent output directory")
    p_init.add_argument("--with-agents", action="store_true", help="also create agents/openai.yaml")
    p_init.set_defaults(func=cmd_init)

    p_validate = sub.add_parser("validate", help="validate a skill folder")
    p_validate.add_argument("--skill-dir", required=True)
    p_validate.set_defaults(func=cmd_validate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
