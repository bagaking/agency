#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

GENERIC_HEADINGS = {
    "问题陈述",
    "问题诊断",
    "方案设计",
    "总结",
    "结论",
}
PLACEHOLDER_PATTERNS = [
    re.compile(r"\bTODO\b", re.IGNORECASE),
    re.compile(r"\bTBD\b", re.IGNORECASE),
    re.compile(r"\{\{.*?\}\}"),
    re.compile(r"待补充"),
]
AI_TONE_PHRASES = ["打稳", "抓手", "返工机器", "接得住", "赋能"]
EXAMPLE_MARKERS = ["例如", "比如", "case", "before", "after"]


@dataclass
class Issue:
    level: str
    code: str
    message: str


def count_long_list_runs(text: str) -> int:
    runs: list[int] = []
    run = 0
    for line in text.splitlines():
        if re.match(r"^\s*(?:[-*]|\d+\.)\s+", line):
            run += 1
        else:
            if run:
                runs.append(run)
            run = 0
    if run:
        runs.append(run)
    return sum(1 for size in runs if size > 5)


def analyze(text: str, min_h2: int, max_h2: int) -> tuple[dict[str, int], list[Issue]]:
    lines = text.splitlines()
    h1 = [ln for ln in lines if re.match(r"^#\s+", ln)]
    h2 = [ln for ln in lines if re.match(r"^##\s+", ln)]
    h3 = [ln for ln in lines if re.match(r"^###\s+", ln)]
    words = re.findall(r"\b\w+\b", text)

    metrics = {
        "h1_count": len(h1),
        "h2_count": len(h2),
        "h3_count": len(h3),
        "word_count": len(words),
        "long_list_runs_over_5": count_long_list_runs(text),
    }

    issues: list[Issue] = []

    if len(h1) != 1:
        issues.append(Issue("error", "H1_COUNT", "article must contain exactly one H1 heading"))

    if not (min_h2 <= len(h2) <= max_h2):
        issues.append(
            Issue(
                "error",
                "H2_RANGE",
                f"H2 count must be between {min_h2} and {max_h2}; got {len(h2)}",
            )
        )

    for pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(text):
            issues.append(Issue("error", "PLACEHOLDER", f"unresolved placeholder matched: {pattern.pattern}"))

    for ln in h2 + h3:
        heading = re.sub(r"^#{2,3}\s+", "", ln).strip()
        if heading in GENERIC_HEADINGS:
            issues.append(
                Issue(
                    "warning",
                    "GENERIC_HEADING",
                    f"heading '{heading}' is too generic for publish-quality scanning",
                )
            )

    if metrics["long_list_runs_over_5"] > 0:
        issues.append(
            Issue(
                "warning",
                "LIST_OVERLOAD",
                f"found {metrics['long_list_runs_over_5']} list block(s) longer than 5 items",
            )
        )

    if not any(marker.lower() in text.lower() for marker in EXAMPLE_MARKERS):
        issues.append(Issue("warning", "NO_EXAMPLE", "no explicit example marker found in article body"))

    for phrase in AI_TONE_PHRASES:
        if phrase in text:
            issues.append(Issue("warning", "AI_TONE", f"phrase '{phrase}' may sound template-like"))

    return metrics, issues


def build_report(input_path: Path, metrics: dict[str, int], issues: list[Issue]) -> str:
    lines = [
        f"# Review Report: {input_path.name}",
        "",
        "## Metrics",
        f"- H1 count: {metrics['h1_count']}",
        f"- H2 count: {metrics['h2_count']}",
        f"- H3 count: {metrics['h3_count']}",
        f"- Word count: {metrics['word_count']}",
        f"- Long list blocks (>5): {metrics['long_list_runs_over_5']}",
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
    parser = argparse.ArgumentParser(description="Check technical article structure and quality signals.")
    parser.add_argument("--input", required=True, help="input markdown file")
    parser.add_argument("--strict", action="store_true", help="exit non-zero when any error exists")
    parser.add_argument("--report", help="optional markdown report output path")
    parser.add_argument("--json", dest="json_out", action="store_true", help="print JSON result")
    parser.add_argument("--min-h2", type=int, default=3)
    parser.add_argument("--max-h2", type=int, default=5)
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.is_file():
        print(f"error: input file not found: {input_path}", file=sys.stderr)
        return 2

    text = input_path.read_text(encoding="utf-8")
    metrics, issues = analyze(text, args.min_h2, args.max_h2)
    errors = [i for i in issues if i.level == "error"]

    payload = {
        "input": str(input_path),
        "metrics": metrics,
        "issues": [i.__dict__ for i in issues],
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
