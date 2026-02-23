#!/usr/bin/env python3
"""Scaffold and validate portable skills with Bagakit-friendly defaults."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import tomllib
except ModuleNotFoundError:
    tomllib = None  # type: ignore[assignment]

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
ALLOWED_GATE_EXTENSIONS = ALLOWED_SCRIPT_EXTENSIONS | {".md", ".txt", ".json", ".yaml", ".yml", ".toml"}
ABSOLUTE_PATH_SCAN_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".toml"}
ABSOLUTE_POSIX_RE = re.compile(
    r"(?<![:A-Za-z0-9_])/(?:Users|home|private|var|tmp|opt|usr|etc|mnt|Volumes|absolute)(?:/[^\s\"'`<>|]+)+"
)
ABSOLUTE_WINDOWS_RE = re.compile(r"(?i)\b[A-Z]:[\\/][^\s\"'`<>|]+")
DISCOURAGED_ADAPTER_KEYS = ("driver_ftharness", "driver_openspec", "driver_longrun")
ANTI_PATTERN_HINTS = ("avoid", "bad pattern", "anti-pattern", "instead of", "不要", "避免", "禁用")
REFERENCE_DIR_CANONICAL = "reference"
REFERENCE_DIR_LEGACY = "references"
REFERENCE_DIR_ALIASES = (REFERENCE_DIR_CANONICAL, REFERENCE_DIR_LEGACY)
GATE_DIR = "gate"
ANTI_PATTERNS_GATE_CASE = "anti-patterns"
ANTI_PATTERNS_GATE_RULES = "rules.toml"
ANTI_PATTERNS_GATE_CHECK_PREFIX = "check-"
ANTI_PATTERNS_GATE_SCRIPT_PATTERN = re.compile(r"^check-[a-z0-9][a-z0-9-]*\.(?:py|sh|js|ts)$")
COMPLEXITY_GUARDRAIL_TERMS_DEFAULT: dict[str, tuple[str, ...]] = {
    "preset-heavy": ("预设偏多", "preset-heavy", "preset", "assumption"),
    "implementation-heavy": ("实现偏重", "implementation-heavy", "script-first", "implementation"),
    "too-many-defaults": ("默认行为太多", "too many defaults", "default behavior", "default"),
    "over-hard-validation": ("校验过硬", "over-hard validation", "strict gate", "strict"),
    "scattered-constraints": ("约束分散", "scattered constraints", "single source", "single-source"),
}
COMPLEXITY_REVIEW_TERMS_DEFAULT = ("check", "review", "audit", "验证", "检查", "审查")
COMPLEXITY_DEFAULT_THRESHOLD = 35
COMPLEXITY_STRICT_THRESHOLD = 90
COMPLEXITY_COMMAND_THRESHOLD = 30
COMPLEXITY_CONSTRAINT_HEADING_THRESHOLD = 4
COMPLEXITY_SINGLE_SOURCE_TERMS_DEFAULT = ("single source", "single-source", "单一来源", "单一约束源")
DISCOVERY_DIR_NAME = "discovery"
DISCOVERY_LOG_BASENAME = "discovery-log.md"
DISCOVERY_TEMPLATE_BASENAME = "discovery-log-tpl.md"
DISCOVERY_MIN_SOURCE_ENTRIES = 3
DISCOVERY_SOURCE_LINE_RE = re.compile(r"(?im)^\s*-\s*(?:source|来源)\s*[:：]\s*\S")
DISCOVERY_PLACEHOLDER_RE = re.compile(r"(?i)\b(?:todo|tbd|placeholder)\b|待补|待填写|待定")
DISCOVERY_ENTRY_FIELD_PATTERNS: dict[str, re.Pattern[str]] = {
    "checked": re.compile(r"(?im)^\s*-\s*(?:checked|what checked|查看内容|查看了什么)\s*[:：]\s*\S"),
    "relevance": re.compile(r"(?im)^\s*-\s*(?:relevance|关联度)\s*[:：]\s*\S"),
    "usefulness": re.compile(r"(?im)^\s*-\s*(?:usefulness|有用程度)\s*[:：]\s*\S"),
    "value": re.compile(r"(?im)^\s*-\s*(?:value|价值|价值判断)\s*[:：]\s*\S"),
    "reference-plan": re.compile(r"(?im)^\s*-\s*(?:reference plan|参考计划|如何参考|复用计划)\s*[:：]\s*\S"),
}


class TomlDecodeError(ValueError):
    pass


def _strip_toml_comment(line: str) -> str:
    in_single = False
    in_double = False
    escaped = False
    for idx, ch in enumerate(line):
        if escaped:
            escaped = False
            continue
        if ch == "\\" and in_double:
            escaped = True
            continue
        if ch == "'" and not in_double:
            in_single = not in_single
            continue
        if ch == '"' and not in_single:
            in_double = not in_double
            continue
        if ch == "#" and not in_single and not in_double:
            return line[:idx]
    return line


def _split_toml_array_items(raw: str, *, lineno: int) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    in_single = False
    in_double = False
    escaped = False
    for ch in raw:
        if escaped:
            buf.append(ch)
            escaped = False
            continue
        if ch == "\\" and in_double:
            buf.append(ch)
            escaped = True
            continue
        if ch == "'" and not in_double:
            in_single = not in_single
            buf.append(ch)
            continue
        if ch == '"' and not in_single:
            in_double = not in_double
            buf.append(ch)
            continue
        if ch == "," and not in_single and not in_double:
            part = "".join(buf).strip()
            if not part:
                raise TomlDecodeError(f"line {lineno}: empty array item")
            parts.append(part)
            buf.clear()
            continue
        buf.append(ch)
    part = "".join(buf).strip()
    if part:
        parts.append(part)
    elif raw.strip():
        raise TomlDecodeError(f"line {lineno}: empty trailing array item")
    return parts


def _unquote_toml_key(raw: str, *, lineno: int) -> str:
    key = raw.strip()
    if not key:
        raise TomlDecodeError(f"line {lineno}: empty key")
    if (key.startswith('"') and key.endswith('"')) or (key.startswith("'") and key.endswith("'")):
        quote = key[0]
        inner = key[1:-1]
        if quote == '"':
            return bytes(inner, "utf-8").decode("unicode_escape")
        return inner
    return key


def _parse_simple_toml_value(raw: str, *, lineno: int) -> Any:
    value = raw.strip()
    if not value:
        raise TomlDecodeError(f"line {lineno}: missing value")
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [_parse_simple_toml_value(item, lineno=lineno) for item in _split_toml_array_items(inner, lineno=lineno)]
    if value.startswith('"') and value.endswith('"'):
        return bytes(value[1:-1], "utf-8").decode("unicode_escape")
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if re.fullmatch(r"[+-]?\d+", value):
        return int(value)
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    raise TomlDecodeError(f"line {lineno}: unsupported value '{value}'")


def _parse_simple_toml(text: str) -> dict[str, Any]:
    root: dict[str, Any] = {}
    current: dict[str, Any] = root
    for lineno, raw in enumerate(text.splitlines(), start=1):
        line = _strip_toml_comment(raw).strip()
        if not line:
            continue
        if line.startswith("[") and line.endswith("]"):
            header = line[1:-1].strip()
            if not header:
                raise TomlDecodeError(f"line {lineno}: empty table header")
            current = root
            for part in header.split("."):
                key = _unquote_toml_key(part, lineno=lineno)
                node = current.get(key)
                if node is None:
                    node = {}
                    current[key] = node
                elif not isinstance(node, dict):
                    raise TomlDecodeError(f"line {lineno}: table '{key}' conflicts with scalar")
                current = node
            continue
        if "=" not in line:
            raise TomlDecodeError(f"line {lineno}: expected key = value")
        key_raw, value_raw = line.split("=", 1)
        key = _unquote_toml_key(key_raw, lineno=lineno)
        current[key] = _parse_simple_toml_value(value_raw, lineno=lineno)
    return root


def parse_toml(text: str) -> dict[str, Any]:
    if tomllib is not None:
        try:
            data = tomllib.loads(text)
        except tomllib.TOMLDecodeError as exc:  # type: ignore[union-attr]
            raise TomlDecodeError(str(exc)) from exc
        if not isinstance(data, dict):
            raise TomlDecodeError("TOML root must be a table")
        return data
    return _parse_simple_toml(text)


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
- Enforce search-first discovery as a required gate before implementation.
- Generated files should avoid absolute paths; use relative paths or env variables.
- Keep references organized: docs under `reference/`, templates under `reference/tpl/`.
- Keep validation protocol assets under `gate/<case>/` (`rules.toml` + `check-*.py|sh|js|ts`).

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

0. Run mandatory discovery first, then archive evidence at `reference/discovery/discovery-log.md`.
1. Capture concrete triggering and non-triggering examples.
2. Keep SKILL.md concise; move deep material to `reference/` and templates to `reference/tpl/`.
3. Put deterministic/fragile execution steps into `scripts/`.
4. Put validation rules and validation scripts into `gate/<case>/`.
5. Validate and iterate based on over-trigger/under-trigger behavior.

## Quality Validation Strategy

- Qualitative quality (for example clarification depth, discussion rigor, writing quality) should be defined as prompt rubrics/checklists and reviewed by a coding agent/human.
- Script checks should validate objective invariants only (format, required sections, output destinations, path/runtime contracts).

## Complexity Guardrails (Anti-Bloat Checks)

- `预设偏多` / preset-heavy:
  - Keep assumptions minimal; move scenario-specific presets to optional profile/examples.
  - Check: list defaults explicitly and justify each default in one sentence.
- `实现偏重` / implementation-heavy:
  - Do not solve reasoning quality by adding scripts first.
  - Check: keep qualitative quality in rubric/checklist review before adding new code gates.
- `默认行为太多` / too many defaults:
  - Keep one default path; mark all others optional adapters.
  - Check: ensure no hidden defaults outside one declared default-route section.
- `校验过硬` / over-hard validation:
  - Script gates should verify invariants only, not qualitative depth.
  - Check: qualitative checks stay warning/rubric-based and agent-reviewed.
- `约束分散` / scattered constraints:
  - Keep constraints in one canonical section and reference it elsewhere.
  - Check: avoid duplicate "must" rules across multiple sections/scripts without a single-source statement.

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

## Reference Layout

- Put explanatory docs and guides under `reference/`.
- Put reusable templates under `reference/tpl/`.
- Keep discovery evidence under `reference/discovery/`.
- Avoid mixing templates into generic docs to keep reference hierarchy clean.

## Discovery Evidence (Mandatory)

- Discovery is a hard gate: do not proceed to implementation before search evidence is recorded.
- Persist discovery evidence at `reference/discovery/discovery-log.md`.
- Use template `reference/tpl/discovery-log-tpl.md` as the default format.
- Category headings are task-driven and flexible (for example `skills`, `权威资料`, `论文`, `开源库`).
- Under each category, record concrete inspected items and include:
  - `Source/来源`,
  - `Checked/查看内容`,
  - `Relevance/关联度`,
  - `Usefulness/有用程度`,
  - `Value/价值`,
  - `Reference Plan/参考计划`.
- Minimum evidence: at least 3 source entries.

## Gate Layout (Validation Protocol)

- Put validation protocol assets under `gate/`.
- Each validation case must have one subdirectory (for example `gate/anti-patterns/`).
- Each case directory must include:
  - `rules.toml` as the single-source validation rule spec.
  - at least one `check-*.py|sh|js|ts` script that reads `rules.toml`.
- Keep non-validation runtime scripts in `scripts/`; keep validation scripts in `gate/`.

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
Checks: discovery gate pass + validate pass + payload gate pass + output/archive gate pass.
Next: run one positive and one negative trigger scenario.
```

### Improve

```text
Result: improved existing skill by narrowing trigger scope and reducing ambiguity.
Checks: discovery gate pass + before/after trigger matrix + validate pass + output/archive map verified.
Next: observe one production round and collect misses.
```

### Merge

```text
Result: merged overlapping skills into one coherent scope and contract.
Checks: discovery gate pass + merge map + de-dup rationale + validate pass + archive handoff path verified.
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


def build_discovery_log_template() -> str:
    return """# Discovery Log Template

Use this template before implementation. Category titles are task-driven; examples are only hints.

## skills

- Source: <skill path/url>
- Checked: <what you inspected>
- Relevance: <high|medium|low + reason>
- Usefulness: <high|medium|low + reason>
- Value: <expected impact and reuse value>
- Reference Plan: <how to reuse/adapt/reject in target skill>

## 权威资料

- 来源: <官方文档/标准链接>
- 查看内容: <阅读了哪些部分>
- 关联度: <高/中/低 + 原因>
- 有用程度: <高/中/低 + 原因>
- 价值: <对当前任务的价值>
- 参考计划: <如何落地到目标 skill>

## 论文

- Source: <paper url/path>
- Checked: <abstract/method/eval sections>
- Relevance: <high|medium|low + reason>
- Usefulness: <high|medium|low + reason>
- Value: <methodological value>
- Reference Plan: <what to adopt or reject>

## 开源库

- 来源: <repo url/path>
- 查看内容: <readme/docs/code areas>
- 关联度: <高/中/低 + 原因>
- 有用程度: <高/中/低 + 原因>
- 价值: <engineering value>
- 参考计划: <reuse/adapt/reject + rationale>
"""


def build_discovery_log_seed() -> str:
    return """# Discovery Log

> Discovery is mandatory. Do not implement before filling this log.

## <category-1>

- Source: TODO
- Checked: TODO
- Relevance: TODO
- Usefulness: TODO
- Value: TODO
- Reference Plan: TODO

## <category-2>

- Source: TODO
- Checked: TODO
- Relevance: TODO
- Usefulness: TODO
- Value: TODO
- Reference Plan: TODO

## <category-3>

- Source: TODO
- Checked: TODO
- Relevance: TODO
- Usefulness: TODO
- Value: TODO
- Reference Plan: TODO
"""


def build_discovery_readme() -> str:
    return """# Discovery Evidence

Store mandatory search evidence here before implementation.

- Required log file: `discovery-log.md`
- Template: `../tpl/discovery-log-tpl.md`
- Each entry must include:
  - `Source/来源`
  - `Checked/查看内容`
  - `Relevance/关联度`
  - `Usefulness/有用程度`
  - `Value/价值`
  - `Reference Plan/参考计划`
"""


def build_gate_anti_patterns_rules_toml() -> str:
    return """[complexity_guardrails]
section_heading = "Complexity Guardrails"
min_bullet_count = 5
review_min_hits = 2
default_threshold = 35
strict_threshold = 90
command_threshold = 30
constraint_heading_threshold = 4
review_terms = ["check", "review", "audit", "验证", "检查", "审查"]
single_source_terms = ["single source", "single-source", "单一来源", "单一约束源"]

[complexity_guardrails.required_terms]
"preset-heavy" = ["预设偏多", "preset-heavy", "preset", "assumption"]
"implementation-heavy" = ["实现偏重", "implementation-heavy", "script-first", "implementation"]
"too-many-defaults" = ["默认行为太多", "too many defaults", "default behavior", "default"]
"over-hard-validation" = ["校验过硬", "over-hard validation", "strict gate", "strict"]
"scattered-constraints" = ["约束分散", "scattered constraints", "single source", "single-source"]
"""


def build_gate_anti_patterns_check_script() -> str:
    return """#!/usr/bin/env python3
\"\"\"Check SKILL.md complexity guardrails using gate/anti-patterns/rules.toml.\"\"\"

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:
    tomllib = None


class TomlDecodeError(ValueError):
    pass


def _strip_toml_comment(line: str) -> str:
    in_single = False
    in_double = False
    escaped = False
    for idx, ch in enumerate(line):
        if escaped:
            escaped = False
            continue
        if ch == "\\\\" and in_double:
            escaped = True
            continue
        if ch == "'" and not in_double:
            in_single = not in_single
            continue
        if ch == '"' and not in_single:
            in_double = not in_double
            continue
        if ch == "#" and not in_single and not in_double:
            return line[:idx]
    return line


def _split_toml_array_items(raw: str, *, lineno: int) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    in_single = False
    in_double = False
    escaped = False
    for ch in raw:
        if escaped:
            buf.append(ch)
            escaped = False
            continue
        if ch == "\\\\" and in_double:
            buf.append(ch)
            escaped = True
            continue
        if ch == "'" and not in_double:
            in_single = not in_single
            buf.append(ch)
            continue
        if ch == '"' and not in_single:
            in_double = not in_double
            buf.append(ch)
            continue
        if ch == "," and not in_single and not in_double:
            part = "".join(buf).strip()
            if not part:
                raise TomlDecodeError(f"line {lineno}: empty array item")
            parts.append(part)
            buf.clear()
            continue
        buf.append(ch)
    part = "".join(buf).strip()
    if part:
        parts.append(part)
    elif raw.strip():
        raise TomlDecodeError(f"line {lineno}: empty trailing array item")
    return parts


def _unquote_toml_key(raw: str, *, lineno: int) -> str:
    key = raw.strip()
    if not key:
        raise TomlDecodeError(f"line {lineno}: empty key")
    if (key.startswith('"') and key.endswith('"')) or (key.startswith("'") and key.endswith("'")):
        quote = key[0]
        inner = key[1:-1]
        if quote == '"':
            return bytes(inner, "utf-8").decode("unicode_escape")
        return inner
    return key


def _parse_simple_toml_value(raw: str, *, lineno: int) -> object:
    value = raw.strip()
    if not value:
        raise TomlDecodeError(f"line {lineno}: missing value")
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [_parse_simple_toml_value(item, lineno=lineno) for item in _split_toml_array_items(inner, lineno=lineno)]
    if value.startswith('"') and value.endswith('"'):
        return bytes(value[1:-1], "utf-8").decode("unicode_escape")
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if re.fullmatch(r"[+-]?\\d+", value):
        return int(value)
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    raise TomlDecodeError(f"line {lineno}: unsupported value '{value}'")


def _parse_simple_toml(text: str) -> dict[str, object]:
    root: dict[str, object] = {}
    current: dict[str, object] = root
    for lineno, raw in enumerate(text.splitlines(), start=1):
        line = _strip_toml_comment(raw).strip()
        if not line:
            continue
        if line.startswith("[") and line.endswith("]"):
            header = line[1:-1].strip()
            if not header:
                raise TomlDecodeError(f"line {lineno}: empty table header")
            current = root
            for part in header.split("."):
                key = _unquote_toml_key(part, lineno=lineno)
                node = current.get(key)
                if node is None:
                    node = {}
                    current[key] = node
                elif not isinstance(node, dict):
                    raise TomlDecodeError(f"line {lineno}: table '{key}' conflicts with scalar")
                current = node
            continue
        if "=" not in line:
            raise TomlDecodeError(f"line {lineno}: expected key = value")
        key_raw, value_raw = line.split("=", 1)
        key = _unquote_toml_key(key_raw, lineno=lineno)
        current[key] = _parse_simple_toml_value(value_raw, lineno=lineno)
    return root


def parse_toml(text: str) -> dict[str, object]:
    if tomllib is not None:
        try:
            data = tomllib.loads(text)
        except tomllib.TOMLDecodeError as exc:
            raise TomlDecodeError(str(exc)) from exc
        if not isinstance(data, dict):
            raise TomlDecodeError("TOML root must be a table")
        return data
    return _parse_simple_toml(text)


def section_block(skill_text: str, heading_re: str) -> str | None:
    match = re.search(heading_re, skill_text, flags=re.IGNORECASE | re.MULTILINE)
    if not match:
        return None
    tail = skill_text[match.end() :]
    next_heading = re.search(r"(?m)^##\\s+", tail)
    return tail[: next_heading.start()] if next_heading else tail


def load_rules(path: Path) -> dict[str, object]:
    data = parse_toml(path.read_text(encoding="utf-8"))
    cfg = data.get("complexity_guardrails")
    if not isinstance(cfg, dict):
        raise ValueError("missing [complexity_guardrails] table")
    required_terms = cfg.get("required_terms")
    if not isinstance(required_terms, dict) or not required_terms:
        raise ValueError("missing [complexity_guardrails.required_terms]")
    return cfg


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Complexity Guardrails section against anti-pattern rules")
    parser.add_argument("--skill-md", required=True, help="Path to SKILL.md")
    parser.add_argument("--rules", default="rules.toml", help="Path to rules.toml")
    args = parser.parse_args()

    skill_md = Path(args.skill_md).expanduser().resolve()
    rules_path = Path(args.rules).expanduser().resolve()

    try:
        skill_text = skill_md.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"error: missing file: {skill_md}", file=sys.stderr)
        return 1

    try:
        rules = load_rules(rules_path)
    except FileNotFoundError:
        print(f"error: missing file: {rules_path}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"error: invalid rules: {exc}", file=sys.stderr)
        return 1

    heading = str(rules.get("section_heading", "Complexity Guardrails"))
    block = section_block(skill_text, rf"^##\\s+{re.escape(heading)}(?:\\s*\\(.*\\))?\\s*$")
    if block is None:
        print(f"error: missing section: {heading}", file=sys.stderr)
        return 1

    min_bullet_count = int(rules.get("min_bullet_count", 5))
    bullets = re.findall(r"(?m)^\\s*[-*]\\s+\\S", block)
    if len(bullets) < min_bullet_count:
        print(
            f"error: section '{heading}' requires >= {min_bullet_count} bullets (found {len(bullets)})",
            file=sys.stderr,
        )
        return 1

    block_lower = block.lower()
    required_terms = rules.get("required_terms")
    if isinstance(required_terms, dict):
        for label, terms in required_terms.items():
            if not isinstance(terms, list) or not terms:
                print(f"error: rule '{label}' terms must be non-empty list", file=sys.stderr)
                return 1
            if not any(str(term).lower() in block_lower for term in terms):
                print(f"error: section '{heading}' missing coverage for {label}", file=sys.stderr)
                return 1

    review_terms = rules.get("review_terms", [])
    review_min_hits = int(rules.get("review_min_hits", 2))
    review_hits = 0
    if isinstance(review_terms, list):
        review_hits = sum(1 for term in review_terms if str(term).lower() in block_lower)
    if review_hits < review_min_hits:
        print(
            f"warn: section '{heading}' has low review/check signals ({review_hits}/{review_min_hits})",
            file=sys.stderr,
        )

    print("ok: anti-pattern complexity checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
"""


def build_gate_readme() -> str:
    return """# Gate Protocol

Use `gate/` as the validation protocol root.

- One subdirectory per validation case (for example `anti-patterns`).
- Each case directory must include:
  - `rules.toml` as the single-source rules file.
  - one or more `check-*.py|sh|js|ts` scripts that read `rules.toml`.
- Keep domain docs in `reference/`; keep execution scripts in `scripts/`; keep validation protocol in `gate/`.
"""


def cmd_init(args: argparse.Namespace) -> int:
    name = normalize_name(args.name)
    root = Path(args.path).expanduser().resolve()
    skill_dir = root / name
    if skill_dir.exists():
        eprint(f"error: target directory already exists: {skill_dir}")
        return 1

    includes = ["SKILL.md", REFERENCE_DIR_CANONICAL, "scripts", GATE_DIR]
    if args.with_agents:
        includes.append("agents")

    skill_dir.mkdir(parents=True, exist_ok=False)
    (skill_dir / REFERENCE_DIR_CANONICAL / "tpl").mkdir(parents=True, exist_ok=True)
    (skill_dir / REFERENCE_DIR_CANONICAL / DISCOVERY_DIR_NAME).mkdir(parents=True, exist_ok=True)
    (skill_dir / "scripts").mkdir(parents=True, exist_ok=True)
    (skill_dir / GATE_DIR / ANTI_PATTERNS_GATE_CASE).mkdir(parents=True, exist_ok=True)

    write_text(skill_dir / "SKILL.md", build_skill_md(name))
    write_text(
        skill_dir / "SKILL_PAYLOAD.json",
        json.dumps({"version": 1, "include": includes}, indent=2, ensure_ascii=False) + "\n",
    )
    write_text(
        skill_dir / REFERENCE_DIR_CANONICAL / "start-here.md",
        "# Start Here\n\nAdd reference docs that are too detailed for SKILL.md.\n",
    )
    write_text(
        skill_dir / REFERENCE_DIR_CANONICAL / "tpl" / "template-note.md",
        "# Template Note\n\nPut reusable markdown/json templates in this folder.\n",
    )
    write_text(
        skill_dir / REFERENCE_DIR_CANONICAL / "tpl" / DISCOVERY_TEMPLATE_BASENAME,
        build_discovery_log_template(),
    )
    write_text(
        skill_dir / REFERENCE_DIR_CANONICAL / DISCOVERY_DIR_NAME / "README.md",
        build_discovery_readme(),
    )
    write_text(
        skill_dir / REFERENCE_DIR_CANONICAL / DISCOVERY_DIR_NAME / DISCOVERY_LOG_BASENAME,
        build_discovery_log_seed(),
    )
    write_text(skill_dir / GATE_DIR / "README.md", build_gate_readme())
    write_text(
        skill_dir / GATE_DIR / ANTI_PATTERNS_GATE_CASE / ANTI_PATTERNS_GATE_RULES,
        build_gate_anti_patterns_rules_toml(),
    )
    gate_check_script = skill_dir / GATE_DIR / ANTI_PATTERNS_GATE_CASE / "check-anti-patterns.py"
    write_text(gate_check_script, build_gate_anti_patterns_check_script())
    gate_check_script.chmod(0o755)

    if args.with_agents:
        write_text(skill_dir / "agents" / "openai.yaml", build_openai_yaml(name))

    print(f"created: {skill_dir}")
    print("next:")
    print(f"  1) edit {skill_dir / 'SKILL.md'}")
    print(
        "  2) fill discovery evidence: "
        f"{skill_dir / REFERENCE_DIR_CANONICAL / DISCOVERY_DIR_NAME / DISCOVERY_LOG_BASENAME}"
    )
    print(f"  3) run: {Path(__file__).name} validate --skill-dir {skill_dir}")
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


def default_complexity_gate_rules() -> dict[str, Any]:
    return {
        "section_heading": "Complexity Guardrails",
        "min_bullet_count": 5,
        "required_terms": dict(COMPLEXITY_GUARDRAIL_TERMS_DEFAULT),
        "review_terms": tuple(COMPLEXITY_REVIEW_TERMS_DEFAULT),
        "review_min_hits": 2,
        "default_threshold": COMPLEXITY_DEFAULT_THRESHOLD,
        "strict_threshold": COMPLEXITY_STRICT_THRESHOLD,
        "command_threshold": COMPLEXITY_COMMAND_THRESHOLD,
        "constraint_heading_threshold": COMPLEXITY_CONSTRAINT_HEADING_THRESHOLD,
        "single_source_terms": tuple(COMPLEXITY_SINGLE_SOURCE_TERMS_DEFAULT),
    }


def _coerce_string_list(raw: object) -> list[str] | None:
    if not isinstance(raw, list):
        return None
    values = [item.strip() for item in raw if isinstance(item, str) and item.strip()]
    if len(values) != len(raw):
        return None
    if not values:
        return None
    return values


def _coerce_positive_int(raw: object) -> int | None:
    if isinstance(raw, bool) or not isinstance(raw, int):
        return None
    if raw <= 0:
        return None
    return raw


def load_complexity_gate_rules(skill_dir: Path) -> tuple[dict[str, Any], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    rules = default_complexity_gate_rules()
    rules_file = skill_dir / GATE_DIR / ANTI_PATTERNS_GATE_CASE / ANTI_PATTERNS_GATE_RULES
    rel_rules_file = rules_file.relative_to(skill_dir).as_posix()

    if not rules_file.exists():
        errors.append(f"missing gate rules file: {rel_rules_file}")
        return rules, errors, warnings

    try:
        raw_data = parse_toml(rules_file.read_text(encoding="utf-8"))
    except TomlDecodeError as exc:
        errors.append(f"invalid TOML in {rel_rules_file}: {exc}")
        return rules, errors, warnings

    cfg = raw_data.get("complexity_guardrails")
    if not isinstance(cfg, dict):
        errors.append(f"{rel_rules_file} must define [complexity_guardrails]")
        return rules, errors, warnings

    section_heading = cfg.get("section_heading")
    if isinstance(section_heading, str) and section_heading.strip():
        rules["section_heading"] = section_heading.strip()
    elif section_heading is not None:
        errors.append(f"{rel_rules_file} complexity_guardrails.section_heading must be non-empty string")

    for key in (
        "min_bullet_count",
        "review_min_hits",
        "default_threshold",
        "strict_threshold",
        "command_threshold",
        "constraint_heading_threshold",
    ):
        if key not in cfg:
            continue
        value = _coerce_positive_int(cfg.get(key))
        if value is None:
            errors.append(f"{rel_rules_file} complexity_guardrails.{key} must be positive integer")
            continue
        rules[key] = value

    review_terms = cfg.get("review_terms")
    if review_terms is not None:
        parsed_review_terms = _coerce_string_list(review_terms)
        if parsed_review_terms is None:
            errors.append(f"{rel_rules_file} complexity_guardrails.review_terms must be a non-empty string array")
        else:
            rules["review_terms"] = tuple(parsed_review_terms)

    single_source_terms = cfg.get("single_source_terms")
    if single_source_terms is not None:
        parsed_single_source_terms = _coerce_string_list(single_source_terms)
        if parsed_single_source_terms is None:
            errors.append(
                f"{rel_rules_file} complexity_guardrails.single_source_terms must be a non-empty string array"
            )
        else:
            rules["single_source_terms"] = tuple(parsed_single_source_terms)

    raw_required_terms = cfg.get("required_terms")
    if raw_required_terms is None:
        errors.append(f"{rel_rules_file} must define [complexity_guardrails.required_terms]")
    elif not isinstance(raw_required_terms, dict):
        errors.append(f"{rel_rules_file} complexity_guardrails.required_terms must be a key/value table")
    else:
        parsed_required_terms: dict[str, tuple[str, ...]] = {}
        for label, terms in raw_required_terms.items():
            if not isinstance(label, str) or not label.strip():
                errors.append(f"{rel_rules_file} required term labels must be non-empty strings")
                continue
            parsed_terms = _coerce_string_list(terms)
            if parsed_terms is None:
                errors.append(
                    f"{rel_rules_file} complexity_guardrails.required_terms.{label} must be a non-empty string array"
                )
                continue
            parsed_required_terms[label.strip()] = tuple(parsed_terms)
        if parsed_required_terms:
            rules["required_terms"] = parsed_required_terms

    required_labels = set(COMPLEXITY_GUARDRAIL_TERMS_DEFAULT.keys())
    loaded_labels = set(rules["required_terms"].keys())
    missing_labels = sorted(required_labels - loaded_labels)
    if missing_labels:
        warnings.append(
            f"{rel_rules_file} missing canonical anti-bloat labels: {', '.join(missing_labels)}; using fallback defaults"
        )
        merged_required_terms = dict(COMPLEXITY_GUARDRAIL_TERMS_DEFAULT)
        merged_required_terms.update(rules["required_terms"])
        rules["required_terms"] = merged_required_terms

    return rules, errors, warnings


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


def detect_reference_layout(skill_dir: Path) -> tuple[bool, bool]:
    has_canonical = (skill_dir / REFERENCE_DIR_CANONICAL).exists()
    has_legacy = (skill_dir / REFERENCE_DIR_LEGACY).exists()
    return has_canonical, has_legacy


def resolve_reference_root(skill_dir: Path) -> Path | None:
    canonical = skill_dir / REFERENCE_DIR_CANONICAL
    legacy = skill_dir / REFERENCE_DIR_LEGACY
    if canonical.is_dir():
        return canonical
    if legacy.is_dir():
        return legacy
    return None


def scan_discovery_evidence(skill_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    reference_root = resolve_reference_root(skill_dir)
    if reference_root is None:
        errors.append(
            f"missing {REFERENCE_DIR_CANONICAL}/ (or legacy {REFERENCE_DIR_LEGACY}/); discovery evidence requires "
            f"{REFERENCE_DIR_CANONICAL}/{DISCOVERY_DIR_NAME}/{DISCOVERY_LOG_BASENAME}"
        )
        return errors, warnings

    discovery_dir = reference_root / DISCOVERY_DIR_NAME
    rel_discovery_dir = discovery_dir.relative_to(skill_dir).as_posix()
    if not discovery_dir.is_dir():
        errors.append(f"missing mandatory discovery directory: {rel_discovery_dir}")
        return errors, warnings

    discovery_log = discovery_dir / DISCOVERY_LOG_BASENAME
    rel_discovery_log = discovery_log.relative_to(skill_dir).as_posix()
    if not discovery_log.is_file():
        errors.append(f"missing mandatory discovery log: {rel_discovery_log}")
        return errors, warnings

    text = discovery_log.read_text(encoding="utf-8")
    category_headings = re.findall(r"(?m)^##\s+\S", text)
    if len(category_headings) < 1:
        errors.append(f"{rel_discovery_log} must include task-driven category headings (use at least one `## <category>`)")
    for heading in category_headings:
        if DISCOVERY_PLACEHOLDER_RE.search(heading) or "<category" in heading.lower():
            errors.append(
                f"{rel_discovery_log} contains placeholder category heading: {heading.strip()}; "
                "replace with task-specific category titles"
            )

    source_matches = list(DISCOVERY_SOURCE_LINE_RE.finditer(text))
    if len(source_matches) < DISCOVERY_MIN_SOURCE_ENTRIES:
        errors.append(
            f"{rel_discovery_log} must include at least {DISCOVERY_MIN_SOURCE_ENTRIES} discovery source entries "
            "(`- Source:` or `- 来源:`)"
        )
        return errors, warnings

    for idx, match in enumerate(source_matches, start=1):
        start = match.start()
        end = source_matches[idx].start() if idx < len(source_matches) else len(text)
        block = text[start:end]
        missing_fields = [
            field for field, pattern in DISCOVERY_ENTRY_FIELD_PATTERNS.items() if not pattern.search(block)
        ]
        if missing_fields:
            errors.append(
                f"{rel_discovery_log} entry #{idx} missing fields: {', '.join(missing_fields)} "
                "(required: Source/Checked/Relevance/Usefulness/Value/Reference Plan)"
            )
        if DISCOVERY_PLACEHOLDER_RE.search(block):
            errors.append(
                f"{rel_discovery_log} entry #{idx} contains placeholder tokens (TODO/TBD/etc); "
                "discovery gate requires concrete inspected content"
            )

    tpl_file = reference_root / "tpl" / DISCOVERY_TEMPLATE_BASENAME
    rel_tpl_file = tpl_file.relative_to(skill_dir).as_posix()
    if not tpl_file.is_file():
        warnings.append(
            f"missing discovery template: {rel_tpl_file}; add tpl for consistent search evidence capture"
        )

    return errors, warnings


def scan_gate_layout(skill_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    gate_root = skill_dir / GATE_DIR
    if not gate_root.exists():
        errors.append(
            f"missing '{GATE_DIR}/' directory; store validation protocol assets under "
            f"'{GATE_DIR}/<case>/' with rules.toml + check scripts"
        )
        return errors, warnings

    if not gate_root.is_dir():
        errors.append(f"{GATE_DIR} exists but is not a directory")
        return errors, warnings

    case_dirs = sorted(path for path in gate_root.iterdir() if path.is_dir())
    if not case_dirs:
        errors.append(f"{GATE_DIR}/ must include at least one validation case subdirectory")
        return errors, warnings

    has_anti_patterns_case = False
    for case_dir in case_dirs:
        rel_case = case_dir.relative_to(skill_dir).as_posix()
        if case_dir.name == ANTI_PATTERNS_GATE_CASE:
            has_anti_patterns_case = True
        rules_path = case_dir / ANTI_PATTERNS_GATE_RULES
        if not rules_path.is_file():
            errors.append(f"{rel_case} must include {ANTI_PATTERNS_GATE_RULES}")

        check_scripts = sorted(
            path for path in case_dir.iterdir() if path.is_file() and ANTI_PATTERNS_GATE_SCRIPT_PATTERN.match(path.name)
        )
        if not check_scripts:
            errors.append(
                f"{rel_case} must include at least one '{ANTI_PATTERNS_GATE_CHECK_PREFIX}*.py|sh|js|ts' script"
            )

    if not has_anti_patterns_case:
        errors.append(f"{GATE_DIR}/ should include '{ANTI_PATTERNS_GATE_CASE}/' for anti-bloat checks")

    scripts_root = skill_dir / "scripts"
    if scripts_root.is_dir():
        for path in sorted(scripts_root.rglob("*")):
            if not path.is_file():
                continue
            stem = path.stem.lower()
            if re.match(r"^(?:check|validate|audit|lint|gate)(?:[-_].*)?$", stem):
                rel = path.relative_to(skill_dir).as_posix()
                warnings.append(f"validation-like script detected outside gate/: {rel}; prefer {GATE_DIR}/<case>/")

    return errors, warnings


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


def scan_complexity_guardrails(skill_text: str, rules: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    heading = str(rules.get("section_heading", "Complexity Guardrails"))
    block = section_block(skill_text, rf"^##\s+{re.escape(heading)}(?:\s*\(.*\))?\s*$")
    if block is None:
        errors.append(
            f"SKILL.md must include '## {heading}' section covering preset-heavy / implementation-heavy / too-many-defaults / over-hard-validation / scattered-constraints checks"
        )
        return errors, warnings

    bullets = re.findall(r"(?m)^\s*[-*]\s+\S", block)
    min_bullet_count = int(rules.get("min_bullet_count", 5))
    if len(bullets) < min_bullet_count:
        errors.append(f"{heading} section must include at least {min_bullet_count} bullet checks")

    lower = block.lower()
    required_terms: dict[str, tuple[str, ...]] = rules.get("required_terms", COMPLEXITY_GUARDRAIL_TERMS_DEFAULT)
    for label, terms in required_terms.items():
        if not any(term.lower() in lower for term in terms):
            errors.append(
                f"{heading} section missing coverage for: {label}"
            )

    review_terms: tuple[str, ...] = rules.get("review_terms", COMPLEXITY_REVIEW_TERMS_DEFAULT)
    review_min_hits = int(rules.get("review_min_hits", 2))
    review_hits = sum(1 for term in review_terms if term.lower() in lower)
    if review_hits < review_min_hits:
        warnings.append(f"{heading} section should include explicit review/check actions")

    skill_lower = skill_text.lower()
    default_count = len(re.findall(r"\bdefault\b|默认", skill_lower))
    default_threshold = int(rules.get("default_threshold", COMPLEXITY_DEFAULT_THRESHOLD))
    if default_count > default_threshold:
        warnings.append(
            f"possible default-overload detected (default_count={default_count}); verify defaults are minimal and opt-in"
        )

    strict_count = len(re.findall(r"\bmust\b|必须", skill_lower))
    strict_threshold = int(rules.get("strict_threshold", COMPLEXITY_STRICT_THRESHOLD))
    if strict_count > strict_threshold:
        warnings.append(
            f"possible over-hard-validation drift (must_count={strict_count}); keep hard gates to objective invariants only"
        )

    command_count = len(
        re.findall(
            r"(?m)^\s*(?:[-*]|\d+[.)])?\s*(?:bash|sh|python3?|node|npm|pnpm|yarn|make)\b",
            skill_text,
        )
    )
    command_threshold = int(rules.get("command_threshold", COMPLEXITY_COMMAND_THRESHOLD))
    if command_count > command_threshold:
        warnings.append(
            f"possible implementation-heavy drift (command_count={command_count}); prefer guidance/rubric before adding runtime commands"
        )

    constraint_heading_count = len(re.findall(r"(?im)^##\s+.*(?:constraint|约束|规则).*$", skill_text))
    constraint_heading_threshold = int(
        rules.get("constraint_heading_threshold", COMPLEXITY_CONSTRAINT_HEADING_THRESHOLD)
    )
    single_source_terms: tuple[str, ...] = rules.get("single_source_terms", COMPLEXITY_SINGLE_SOURCE_TERMS_DEFAULT)
    if constraint_heading_count > constraint_heading_threshold and not any(
        token.lower() in skill_lower for token in single_source_terms
    ):
        warnings.append(
            "constraint sections are highly distributed; add a single-source constraint statement to prevent drift"
        )

    return errors, warnings


def audit_runtime_files(skill_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    runtime_dirs = {
        "scripts": ALLOWED_SCRIPT_EXTENSIONS,
        GATE_DIR: ALLOWED_GATE_EXTENSIONS,
        REFERENCE_DIR_CANONICAL: ALLOWED_REFERENCE_EXTENSIONS,
        REFERENCE_DIR_LEGACY: ALLOWED_REFERENCE_EXTENSIONS,
    }

    for dirname, allowed_ext in runtime_dirs.items():
        root = skill_dir / dirname
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            if "__pycache__" in path.parts or path.suffix.lower() == ".pyc":
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
    scan_roots = include[:] if include else [REFERENCE_DIR_CANONICAL, REFERENCE_DIR_LEGACY, GATE_DIR, "agents"]

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
    is_bagakit_series = bool(name) and name.startswith("bagakit-")
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
        has_reference_canonical, has_reference_legacy = detect_reference_layout(skill_dir)
        has_reference_include = any(item in include_set for item in REFERENCE_DIR_ALIASES)
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
        for runtime_dir in ("scripts", "agents", GATE_DIR):
            exists = (skill_dir / runtime_dir).exists()
            has = runtime_dir in include_set
            if exists and not has:
                warnings.append(f"directory exists but not included in payload: {runtime_dir}")
            if has and not exists:
                errors.append(f"payload includes missing directory: {runtime_dir}")

        if (has_reference_canonical or has_reference_legacy) and not has_reference_include:
            warnings.append(
                f"directory exists but not included in payload: {REFERENCE_DIR_CANONICAL}/{REFERENCE_DIR_LEGACY}"
            )
        if REFERENCE_DIR_CANONICAL in include_set and not has_reference_canonical:
            errors.append(f"payload includes missing directory: {REFERENCE_DIR_CANONICAL}")
        if REFERENCE_DIR_LEGACY in include_set and not has_reference_legacy:
            errors.append(f"payload includes missing directory: {REFERENCE_DIR_LEGACY}")
        if has_reference_canonical and not (skill_dir / REFERENCE_DIR_CANONICAL / "tpl").is_dir():
            warnings.append("reference layout should include reference/tpl for reusable templates")
        if has_reference_legacy and not has_reference_canonical:
            warnings.append("legacy references/ layout detected; prefer reference/ with reference/tpl")
        if has_reference_canonical and has_reference_legacy:
            warnings.append(
                "both reference/ and references/ exist; prefer one canonical layout (reference/ + reference/tpl)"
            )

    discovery_errors, discovery_warnings = scan_discovery_evidence(skill_dir)
    errors.extend(discovery_errors)
    warnings.extend(discovery_warnings)

    lines = skill_text.splitlines()
    if len(lines) > MAX_SKILL_LINES:
        errors.append(f"SKILL.md must stay within {MAX_SKILL_LINES} lines (current={len(lines)})")

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
    gate_errors, gate_warnings = scan_gate_layout(skill_dir)
    errors.extend(gate_errors)
    warnings.extend(gate_warnings)
    complexity_rules, complexity_rule_errors, complexity_rule_warnings = load_complexity_gate_rules(skill_dir)
    errors.extend(complexity_rule_errors)
    warnings.extend(complexity_rule_warnings)
    complexity_errors, complexity_warnings = scan_complexity_guardrails(skill_text, complexity_rules)
    errors.extend(complexity_errors)
    warnings.extend(complexity_warnings)
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
