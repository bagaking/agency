#!/usr/bin/env python3
"""Check SKILL.md complexity guardrails using gate/anti-patterns/rules.toml."""

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
    if re.fullmatch(r"[+-]?\d+", value):
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
    next_heading = re.search(r"(?m)^##\s+", tail)
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
    block = section_block(skill_text, rf"^##\s+{re.escape(heading)}(?:\s*\(.*\))?\s*$")
    if block is None:
        print(f"error: missing section: {heading}", file=sys.stderr)
        return 1

    min_bullet_count = int(rules.get("min_bullet_count", 5))
    bullets = re.findall(r"(?m)^\s*[-*]\s+\S", block)
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
