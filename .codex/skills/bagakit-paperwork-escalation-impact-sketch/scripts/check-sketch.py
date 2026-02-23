#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

PLACEHOLDER_PATTERNS = [
    re.compile(r"\bTODO\b", re.IGNORECASE),
    re.compile(r"\bTBD\b", re.IGNORECASE),
    re.compile(r"\{\{.*?\}\}"),
    re.compile(r"待补充"),
]

STEP_PATTERNS = {
    "HOOK": re.compile(r"hook|钩子", re.IGNORECASE),
    "PING_PONG": re.compile(r"ping[- ]?pong|互怼|甩锅", re.IGNORECASE),
    "ESCALATION": re.compile(r"escalation|升级", re.IGNORECASE),
    "ANCHOR_QUESTION": re.compile(r"anchor\s*question|追问", re.IGNORECASE),
    "COLD_KNIFE": re.compile(r"cold\s*knife|冷刀", re.IGNORECASE),
}

BLAME_PATTERN = re.compile(r"我问你")
MORALIZING_PATTERNS = [
    re.compile(r"所以要"),
    re.compile(r"这就是"),
    re.compile(r"大家要注意"),
    re.compile(r"应该"),
    re.compile(r"必须"),
]
ESCALATION_TERMS = [
    "老板",
    "客户",
    "候选人",
    "需求方",
    "会议室",
    "投屏",
    "群",
    "复盘",
    "面试",
    "第一排",
]
FACT_TAIL_TERMS = [
    "回了",
    "在场",
    "坐",
    "来了",
    "就在",
    "第一排",
    "门口",
    "点了",
]
VISUAL_TERMS = [
    "门口",
    "第一排",
    "投屏",
    "会议室",
    "群里",
    "屏幕",
]
JARGON_TERMS = ["403", "staging", "token", "namespace", "k8s", "rpc", "yaml"]


@dataclass
class Issue:
    level: str
    code: str
    message: str


def strip_code_fences(lines: list[str]) -> list[str]:
    out: list[str] = []
    in_fence = False
    for line in lines:
        if re.match(r"^\s*```", line):
            in_fence = not in_fence
            continue
        if not in_fence:
            out.append(line)
    return out


def normalize_line(line: str) -> str:
    cleaned = line.strip()
    cleaned = re.sub(r"^[-*]\s+", "", cleaned)
    cleaned = re.sub(r"^\d+\.\s+", "", cleaned)
    return cleaned.strip()


def extract_content_lines(text: str) -> list[str]:
    raw = strip_code_fences(text.splitlines())
    lines: list[str] = []
    for line in raw:
        normalized = normalize_line(line)
        if not normalized:
            continue
        if normalized.startswith("#"):
            continue
        lines.append(normalized)
    return lines


def contains_question(line: str) -> bool:
    return "?" in line or "？" in line


def count_hits(text: str, terms: list[str]) -> int:
    lower = text.lower()
    return sum(lower.count(term.lower()) for term in terms)


def analyze(text: str, min_lines: int, max_lines: int) -> tuple[dict[str, int | float], list[Issue]]:
    lines = extract_content_lines(text)
    issues: list[Issue] = []

    line_count = len(lines)
    question_count = sum(1 for line in lines if contains_question(line))
    blame_hits = len(BLAME_PATTERN.findall(text))
    escalation_hits = count_hits(text, ESCALATION_TERMS)
    jargon_hits = count_hits(text, JARGON_TERMS)
    visual_hits = count_hits(text, VISUAL_TERMS)

    first_line = lines[0] if lines else ""
    last_line = lines[-1] if lines else ""
    half_index = max(1, line_count // 2)
    anchor_questions = sum(1 for line in lines[half_index:] if contains_question(line))

    step_labeled = {key: bool(pattern.search(text)) for key, pattern in STEP_PATTERNS.items()}

    hook_ok = step_labeled["HOOK"] or contains_question(first_line)
    ping_pong_ok = step_labeled["PING_PONG"] or blame_hits >= 1
    escalation_ok = step_labeled["ESCALATION"] or escalation_hits >= 1
    anchor_ok = step_labeled["ANCHOR_QUESTION"] or anchor_questions >= 1

    cold_has_label = step_labeled["COLD_KNIFE"]
    cold_has_fact = any(term in last_line for term in FACT_TAIL_TERMS)
    cold_not_question = not contains_question(last_line)
    cold_ok = cold_has_label or (cold_has_fact and cold_not_question)

    moralizing_tail = any(pattern.search(last_line) for pattern in MORALIZING_PATTERNS)

    metrics: dict[str, int | float] = {
        "line_count": line_count,
        "question_count": question_count,
        "anchor_question_count": anchor_questions,
        "blame_pattern_hits": blame_hits,
        "escalation_signal_hits": escalation_hits,
        "visual_signal_hits": visual_hits,
        "jargon_hits": jargon_hits,
        "hook_ok": int(hook_ok),
        "ping_pong_ok": int(ping_pong_ok),
        "escalation_ok": int(escalation_ok),
        "anchor_ok": int(anchor_ok),
        "cold_knife_ok": int(cold_ok),
        "moralizing_tail": int(moralizing_tail),
    }

    if line_count < min_lines or line_count > max_lines:
        issues.append(
            Issue(
                "error",
                "LINE_RANGE",
                f"dialogue line count must be in [{min_lines}, {max_lines}], got {line_count}",
            )
        )

    for pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(text):
            issues.append(Issue("error", "PLACEHOLDER", f"unresolved placeholder matched: {pattern.pattern}"))

    if not hook_ok:
        issues.append(Issue("error", "HOOK_MISSING", "missing effective Hook (opening problem question)"))
    if not ping_pong_ok:
        issues.append(Issue("error", "PING_PONG_MISSING", "missing blame ping-pong chain (e.g. '我问你...你说...')"))
    if not escalation_ok:
        issues.append(Issue("error", "ESCALATION_MISSING", "missing escalation signal to organization/social scene"))
    if not anchor_ok:
        issues.append(Issue("error", "ANCHOR_QUESTION_MISSING", "missing anchor question in latter half"))
    if not cold_ok:
        issues.append(Issue("error", "COLD_KNIFE_MISSING", "final line is not a cold-fact punchline"))

    if question_count < 2:
        issues.append(Issue("error", "QUESTION_COUNT", "need at least 2 questions (opening + anchor question)"))

    if blame_hits < 1:
        issues.append(Issue("error", "BLAME_PATTERN", "need at least one '我问你...你说...' blame engine"))

    if moralizing_tail:
        issues.append(Issue("error", "MORALIZING_ENDING", "final line must be fact, not moral/explanation"))

    if escalation_hits < 1:
        issues.append(Issue("error", "ESCALATION_SIGNAL", "missing high-pressure escalation target (boss/client/meeting/etc.)"))

    if jargon_hits >= 3:
        issues.append(Issue("warning", "JARGON_OVERLOAD", "technical jargon density is high; keep joke on people/situations"))

    if visual_hits < 1:
        issues.append(Issue("warning", "VISUAL_ANCHOR_WEAK", "visual scene anchors are weak (door/first-row/screen/room/group)") )

    if line_count < 10:
        issues.append(Issue("warning", "THIN_BODY", "script is very short; check whether escalation is sufficiently layered"))

    return metrics, issues


def build_report(input_path: Path, metrics: dict[str, int | float], issues: list[Issue]) -> str:
    lines = [
        f"# Review Report: {input_path.name}",
        "",
        "## Metrics",
        f"- Line count: {metrics['line_count']}",
        f"- Question count: {metrics['question_count']}",
        f"- Anchor question count: {metrics['anchor_question_count']}",
        f"- Blame pattern hits: {metrics['blame_pattern_hits']}",
        f"- Escalation signal hits: {metrics['escalation_signal_hits']}",
        f"- Visual signal hits: {metrics['visual_signal_hits']}",
        f"- Jargon hits: {metrics['jargon_hits']}",
        f"- Hook OK: {metrics['hook_ok']}",
        f"- Ping-pong OK: {metrics['ping_pong_ok']}",
        f"- Escalation OK: {metrics['escalation_ok']}",
        f"- Anchor question OK: {metrics['anchor_ok']}",
        f"- Cold knife OK: {metrics['cold_knife_ok']}",
        f"- Moralizing tail: {metrics['moralizing_tail']}",
        "",
        "## Issues",
    ]

    if not issues:
        lines.append("- none")
    else:
        for issue in issues:
            lines.append(f"- [{issue.level}] {issue.code}: {issue.message}")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check EIS escalation sketch structure and quality signals.")
    parser.add_argument("--input", required=True, help="input markdown file")
    parser.add_argument("--strict", action="store_true", help="exit non-zero when any error exists")
    parser.add_argument("--report", help="optional markdown report output path")
    parser.add_argument("--json", dest="json_out", action="store_true", help="print JSON result")
    parser.add_argument("--min-lines", type=int, default=8)
    parser.add_argument("--max-lines", type=int, default=18)
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.is_file():
        print(f"error: input file not found: {input_path}", file=sys.stderr)
        return 2

    text = input_path.read_text(encoding="utf-8")
    metrics, issues = analyze(text, args.min_lines, args.max_lines)
    errors = [item for item in issues if item.level == "error"]

    payload = {
        "input": str(input_path),
        "metrics": metrics,
        "issues": [issue.__dict__ for issue in issues],
        "error_count": len(errors),
        "warning_count": len(issues) - len(errors),
        "status": "fail" if errors else "pass",
    }

    if args.report:
        report_path = Path(args.report).resolve()
        report_path.write_text(build_report(input_path, metrics, issues), encoding="utf-8")

    if args.json_out:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"status={payload['status']}")
        print(f"errors={payload['error_count']}")
        print(f"warnings={payload['warning_count']}")

    if args.strict and errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
