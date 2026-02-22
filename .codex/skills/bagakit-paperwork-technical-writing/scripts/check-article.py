#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

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
CASE_MARKERS = ["例如", "比如", "case", "before", "after", "场景", "示例", "样例"]
ANTI_PATTERN_MARKERS = ["反模式", "anti-pattern", "踩坑", "failure mode"]
OPERATIONAL_SIGNAL_MARKERS = [
    "验证信号",
    "通过信号",
    "pass threshold",
    "threshold",
    "下一步",
    "next action",
    "清单",
    "checklist",
]
PROCESS_SCAFFOLD_LINE_PATTERNS = {
    "READER_CONTRACT": re.compile(r"^\s*###\s+Reader contract\s*$", re.IGNORECASE),
    "TASK_AFTER_READING": re.compile(r"^\s*-\s*Task after reading\s*:", re.IGNORECASE),
    "OUT_OF_SCOPE": re.compile(r"^\s*-\s*Out of scope\s*:", re.IGNORECASE),
    "SUCCESS_SIGNAL": re.compile(r"^\s*-\s*Success signal\s*:", re.IGNORECASE),
}
EXECUTION_FIELD_TOKENS = [
    "discussion_clear",
    "user_review_status",
    "claim_validation",
    "tool_usability",
    "handoff_destination",
]
SCOPE_CUT_MARKERS = ["scope cut", "范围收缩", "摘要版", "简版", "scope narrowed"]
LONG_SAMPLE_MIN_LINES = 12
PROFILE_RULES: dict[str, dict[str, int]] = {
    "general": {
        "min_words": 0,
        "min_case_markers": 0,
        "min_mermaid_diagrams": 0,
        "min_table_count": 0,
        "min_full_sample_anchor": 0,
    },
    "brainstorm": {
        "min_words": 320,
        "min_case_markers": 2,
        "min_mermaid_diagrams": 1,
        "min_table_count": 0,
        "min_full_sample_anchor": 0,
    },
    "protocol": {
        "min_words": 420,
        "min_case_markers": 2,
        "min_mermaid_diagrams": 0,
        "min_table_count": 0,
        "min_full_sample_anchor": 1,
    },
    "infrastructure": {
        "min_words": 420,
        "min_case_markers": 2,
        "min_mermaid_diagrams": 0,
        "min_table_count": 0,
        "min_full_sample_anchor": 1,
    },
}


@dataclass
class Issue:
    level: str
    code: str
    message: str
    line: int | None = None


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


def extract_non_code_lines(lines: Iterable[str]) -> list[tuple[int, str]]:
    kept: list[tuple[int, str]] = []
    in_fence = False
    for lineno, line in enumerate(lines, start=1):
        if re.match(r"^\s*```", line):
            in_fence = not in_fence
            continue
        if not in_fence:
            kept.append((lineno, line))
    return kept


def fenced_block_lengths(text: str) -> list[int]:
    lengths: list[int] = []
    in_fence = False
    current_len = 0
    for line in text.splitlines():
        if re.match(r"^\s*```", line):
            if in_fence:
                lengths.append(current_len)
                in_fence = False
                current_len = 0
            else:
                in_fence = True
                current_len = 0
            continue
        if in_fence and line.strip():
            current_len += 1
    return lengths


def count_mermaid_diagrams(text: str) -> int:
    return len(re.findall(r"(?mi)^\s*```mermaid\s*$", text))


def count_markdown_tables(lines: Iterable[str]) -> int:
    rows = list(lines)
    table_count = 0
    separator_pattern = re.compile(r"^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$")
    for idx in range(1, len(rows)):
        if "|" not in rows[idx - 1]:
            continue
        if separator_pattern.match(rows[idx]):
            table_count += 1
    return table_count


def count_case_markers(text: str) -> int:
    lower = text.lower()
    return sum(lower.count(marker.lower()) for marker in CASE_MARKERS)


def apply_profile_gates(
    profile: str,
    metrics: dict[str, float | int],
    issues: list[Issue],
) -> None:
    if profile == "general":
        return

    rules = PROFILE_RULES.get(profile, PROFILE_RULES["general"])
    level = "error"

    checks: list[tuple[str, str, str]] = [
        ("word_count", "min_words", "PROFILE_WORD_FLOOR"),
        ("case_marker_hits", "min_case_markers", "PROFILE_CASE_FLOOR"),
        ("mermaid_diagram_count", "min_mermaid_diagrams", "PROFILE_DIAGRAM_FLOOR"),
        ("table_count", "min_table_count", "PROFILE_TABLE_FLOOR"),
        ("has_full_sample_anchor", "min_full_sample_anchor", "PROFILE_SAMPLE_FLOOR"),
    ]

    for metric_key, rule_key, code in checks:
        value = int(metrics.get(metric_key, 0))
        threshold = int(rules.get(rule_key, 0))
        if value < threshold:
            issues.append(
                Issue(
                    level,
                    code,
                    f"profile={profile}: {metric_key}={value} below required threshold {threshold}",
                )
            )


def detect_process_scaffold(lines: Iterable[tuple[int, str]]) -> list[Issue]:
    issues: list[Issue] = []
    for lineno, line in lines:
        for code, pattern in PROCESS_SCAFFOLD_LINE_PATTERNS.items():
            if pattern.match(line):
                issues.append(
                    Issue(
                        "warning",
                        "PROCESS_SCAFFOLD",
                        f"planning scaffold line detected ({code}); keep this in outline/review artifacts",
                        lineno,
                    )
                )
                break
    return issues


def detect_internal_directives(lines: Iterable[tuple[int, str]]) -> list[Issue]:
    issues: list[Issue] = []
    for lineno, line in lines:
        if re.match(r"^\s*\[\[BAGAKIT\]\]\s*$", line):
            issues.append(
                Issue(
                    "error",
                    "INTERNAL_DIRECTIVE",
                    "internal directive '[[BAGAKIT]]' is not allowed in publish article",
                    lineno,
                )
            )
        if re.match(r"^\s*-\s*PaperworkWriting\s*:", line):
            issues.append(
                Issue(
                    "error",
                    "INTERNAL_DIRECTIVE",
                    "internal stage footer line is not allowed in publish article",
                    lineno,
                )
            )
    return issues


def compute_evidence_pack(text: str) -> dict[str, int]:
    lower = text.lower()
    has_example = int(any(marker.lower() in lower for marker in EXAMPLE_MARKERS))
    command_line_count = len(re.findall(r"(?mi)^\s*(?:bash|sh|python3?|git)\s+\S+", text))
    if command_line_count == 0 and re.search(r"`(?:bash|sh|python3?|git)\s+[^`\n]+`", text, re.IGNORECASE):
        command_line_count = 1
    hash_count = len(re.findall(r"\b[0-9a-f]{7,40}\b", text))
    path_ref_count = len(re.findall(r"`[^`\n]*(?:/[^`\n]*|\.[a-z0-9]{2,4}(?::\d+)?)`", text, re.IGNORECASE))
    block_lengths = fenced_block_lengths(text)
    code_fence_count = len(block_lengths)
    long_sample_block_count = sum(1 for n in block_lengths if n >= LONG_SAMPLE_MIN_LINES)
    checklist_item_count = len(re.findall(r"(?m)^\s*-\s*\[[ xX]\]\s+", text))
    anti_pattern_hits = sum(lower.count(marker) for marker in ANTI_PATTERN_MARKERS)
    artifact_richness = min(command_line_count, 3) + min(hash_count, 2) + min(path_ref_count, 3) + min(code_fence_count, 2)
    has_artifact_anchor = int(artifact_richness > 0)
    has_antipattern = int(anti_pattern_hits > 0)
    has_checklist = int(checklist_item_count > 0)
    has_full_sample_anchor = int(long_sample_block_count > 0 or command_line_count >= 3)
    has_hard_evidence_anchor = int(command_line_count >= 2 and (hash_count >= 1 or path_ref_count >= 2))
    has_operational_signal = int(
        bool(has_checklist)
        or any(marker in lower for marker in OPERATIONAL_SIGNAL_MARKERS)
    )
    score = (
        has_example
        + has_artifact_anchor
        + has_antipattern
        + has_operational_signal
        + has_full_sample_anchor
        + has_hard_evidence_anchor
    )
    return {
        "has_example_anchor": has_example,
        "has_artifact_anchor": has_artifact_anchor,
        "artifact_richness": artifact_richness,
        "checklist_item_count": checklist_item_count,
        "anti_pattern_hits": anti_pattern_hits,
        "long_sample_block_count": long_sample_block_count,
        "has_full_sample_anchor": has_full_sample_anchor,
        "has_hard_evidence_anchor": has_hard_evidence_anchor,
        "has_antipattern_anchor": has_antipattern,
        "has_operational_anchor": has_operational_signal,
        "evidence_pack_score": score,
    }


def analyze(
    text: str,
    min_h2: int,
    max_h2: int,
    baseline_text: str | None,
    shrink_threshold: float,
    profile: str,
) -> tuple[dict[str, float | int], list[Issue]]:
    lines = text.splitlines()
    lower_text = text.lower()
    non_code_lines = extract_non_code_lines(lines)
    non_code_text = "\n".join(line for _, line in non_code_lines)
    non_code_only_lines = [line for _, line in non_code_lines]
    h1 = [ln for ln in non_code_only_lines if re.match(r"^#\s+", ln)]
    h2 = [ln for ln in non_code_only_lines if re.match(r"^##\s+", ln)]
    h3 = [ln for ln in non_code_only_lines if re.match(r"^###\s+", ln)]
    words = re.findall(r"\b\w+\b", text)

    metrics = {
        "h1_count": len(h1),
        "h2_count": len(h2),
        "h3_count": len(h3),
        "word_count": len(words),
        "char_count": len(text),
        "long_list_runs_over_5": count_long_list_runs(text),
        "profile": profile,
        "case_marker_hits": count_case_markers(text),
        "mermaid_diagram_count": count_mermaid_diagrams(text),
        "table_count": count_markdown_tables(non_code_only_lines),
    }
    metrics.update(compute_evidence_pack(text))

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

    issues.extend(detect_internal_directives(non_code_lines))

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

    issues.extend(detect_process_scaffold(non_code_lines))

    execution_field_hits = sorted(
        {token for token in EXECUTION_FIELD_TOKENS if re.search(rf"\b{re.escape(token)}\b", non_code_text)}
    )
    if len(execution_field_hits) >= 2:
        issues.append(
            Issue(
                "warning",
                "EXECUTION_FIELD_LEAK",
                "execution-only fields detected in publish article: " + ", ".join(execution_field_hits),
            )
        )

    if int(metrics.get("evidence_pack_score", 0)) < 3:
        issues.append(
            Issue(
                "warning",
                "EVIDENCE_PACK_THIN",
                "evidence pack is thin; add concrete artifact/anti-pattern/operational anchors",
            )
        )

    apply_profile_gates(profile, metrics, issues)

    if baseline_text is not None:
        baseline_evidence = compute_evidence_pack(baseline_text)
        baseline_words = re.findall(r"\b\w+\b", baseline_text)
        baseline_word_count = len(baseline_words)
        baseline_char_count = len(baseline_text)
        metrics["baseline_word_count"] = baseline_word_count
        metrics["baseline_char_count"] = baseline_char_count
        metrics["baseline_evidence_pack_score"] = baseline_evidence["evidence_pack_score"]
        metrics["baseline_artifact_richness"] = baseline_evidence["artifact_richness"]
        metrics["baseline_has_full_sample_anchor"] = baseline_evidence["has_full_sample_anchor"]
        metrics["baseline_has_hard_evidence_anchor"] = baseline_evidence["has_hard_evidence_anchor"]
        metrics["baseline_has_antipattern_anchor"] = baseline_evidence["has_antipattern_anchor"]
        metrics["baseline_has_operational_anchor"] = baseline_evidence["has_operational_anchor"]
        current_evidence_score = int(metrics.get("evidence_pack_score", 0))
        if baseline_evidence["evidence_pack_score"] >= 2 and current_evidence_score < baseline_evidence["evidence_pack_score"]:
            issues.append(
                Issue(
                    "warning",
                    "EVIDENCE_PACK_DROP",
                    "evidence pack weaker than baseline; restore key concrete anchors or explain scope cut",
                )
            )
        class_drop_pairs = [
            ("has_full_sample_anchor", "baseline_has_full_sample_anchor", "FULL_SAMPLE_DROP", "full sample anchor"),
            ("has_hard_evidence_anchor", "baseline_has_hard_evidence_anchor", "HARD_EVIDENCE_DROP", "hard evidence chain"),
            ("has_antipattern_anchor", "baseline_has_antipattern_anchor", "ANTIPATTERN_DROP", "anti-pattern block"),
            ("has_operational_anchor", "baseline_has_operational_anchor", "ROLLOUT_DROP", "rollout/checklist anchor"),
        ]
        dropped_classes: list[str] = []
        for current_key, baseline_key, code, label in class_drop_pairs:
            if int(metrics.get(baseline_key, 0)) == 1 and int(metrics.get(current_key, 0)) == 0:
                dropped_classes.append(label)
                issues.append(
                    Issue(
                        "warning",
                        code,
                        f"baseline has {label} but rewrite dropped it; recover or document explicit scope cut",
                    )
                )
        metrics["baseline_dropped_evidence_classes"] = len(dropped_classes)
        if baseline_word_count > 0:
            shrink_ratio = 1 - (metrics["word_count"] / baseline_word_count)
            metrics["word_shrink_ratio"] = round(shrink_ratio, 4)
            has_scope_cut_marker = any(marker in lower_text for marker in SCOPE_CUT_MARKERS)
            metrics["has_scope_cut_marker"] = int(has_scope_cut_marker)
            if shrink_ratio > shrink_threshold:
                issues.append(
                    Issue(
                        "warning",
                        "CONTENT_SHRINK",
                        f"word count dropped by {shrink_ratio:.0%} vs baseline (threshold {shrink_threshold:.0%}); verify no regression",
                    )
                )
            if shrink_ratio > 0.45 and baseline_word_count >= 500 and not has_scope_cut_marker:
                issues.append(
                    Issue(
                        "error",
                        "BASELINE_OVER_COMPRESSION",
                        "rewrite compressed >45% on high-content baseline without explicit scope-cut note",
                    )
                )
            if shrink_ratio > 0.35 and dropped_classes:
                issues.append(
                    Issue(
                        "warning",
                        "REGRESSION_RISK",
                        "rewrite is both compressed and evidence-class reduced vs baseline",
                    )
                )
            if shrink_ratio > 0.45 and len(dropped_classes) >= 2:
                issues.append(
                    Issue(
                        "error",
                        "BASELINE_REGRESSION",
                        "high-compression rewrite dropped multiple baseline evidence classes",
                    )
                )
            current_artifact_richness = int(metrics.get("artifact_richness", 0))
            baseline_artifact_richness = int(metrics.get("baseline_artifact_richness", 0))
            if (
                shrink_ratio > 0.5
                and baseline_artifact_richness >= 4
                and current_artifact_richness + 1 < baseline_artifact_richness
            ):
                issues.append(
                    Issue(
                        "warning",
                        "EVIDENCE_ARTIFACT_DROP",
                        "high-compression rewrite drops concrete artifact density vs baseline",
                    )
                )

    return metrics, issues


def build_report(input_path: Path, metrics: dict[str, float | int], issues: list[Issue]) -> str:
    lines = [
        f"# Review Report: {input_path.name}",
        "",
        "## Metrics",
        f"- Profile: {metrics.get('profile', 'general')}",
        f"- H1 count: {metrics['h1_count']}",
        f"- H2 count: {metrics['h2_count']}",
        f"- H3 count: {metrics['h3_count']}",
        f"- Word count: {metrics['word_count']}",
        f"- Char count: {metrics['char_count']}",
        f"- Long list blocks (>5): {metrics['long_list_runs_over_5']}",
        f"- Evidence pack score: {metrics['evidence_pack_score']}",
        f"- Artifact richness: {metrics['artifact_richness']}",
        f"- Long sample blocks: {metrics.get('long_sample_block_count', 0)}",
        f"- Checklist items: {metrics.get('checklist_item_count', 0)}",
        f"- Anti-pattern hits: {metrics.get('anti_pattern_hits', 0)}",
        f"- Full sample anchor: {metrics.get('has_full_sample_anchor', 0)}",
        f"- Hard evidence anchor: {metrics.get('has_hard_evidence_anchor', 0)}",
        f"- Mermaid diagrams: {metrics.get('mermaid_diagram_count', 0)}",
        f"- Markdown tables: {metrics.get('table_count', 0)}",
        f"- Case marker hits: {metrics.get('case_marker_hits', 0)}",
    ]

    if "baseline_word_count" in metrics:
        lines.extend(
            [
                f"- Baseline word count: {metrics['baseline_word_count']}",
                f"- Baseline char count: {metrics['baseline_char_count']}",
                f"- Baseline evidence pack score: {metrics.get('baseline_evidence_pack_score', 0)}",
                f"- Baseline artifact richness: {metrics.get('baseline_artifact_richness', 0)}",
                f"- Baseline full sample anchor: {metrics.get('baseline_has_full_sample_anchor', 0)}",
                f"- Baseline hard evidence anchor: {metrics.get('baseline_has_hard_evidence_anchor', 0)}",
                f"- Baseline anti-pattern anchor: {metrics.get('baseline_has_antipattern_anchor', 0)}",
                f"- Baseline operational anchor: {metrics.get('baseline_has_operational_anchor', 0)}",
                f"- Dropped evidence classes: {metrics.get('baseline_dropped_evidence_classes', 0)}",
                f"- Scope cut marker present: {metrics.get('has_scope_cut_marker', 0)}",
                f"- Word shrink ratio: {metrics.get('word_shrink_ratio', 0)}",
            ]
        )

    lines.extend(["", "## Issues"])

    if not issues:
        lines.append("- none")
    else:
        for issue in issues:
            if issue.line is None:
                lines.append(f"- [{issue.level}] {issue.code}: {issue.message}")
            else:
                lines.append(f"- [{issue.level}] {issue.code} (line {issue.line}): {issue.message}")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check technical article structure and quality signals.")
    parser.add_argument("--input", required=True, help="input markdown file")
    parser.add_argument("--strict", action="store_true", help="exit non-zero when any error exists")
    parser.add_argument("--report", help="optional markdown report output path")
    parser.add_argument("--json", dest="json_out", action="store_true", help="print JSON result")
    parser.add_argument("--baseline", help="optional baseline markdown file for regression signals")
    parser.add_argument(
        "--shrink-threshold",
        type=float,
        default=0.35,
        help="warning threshold for baseline shrink ratio (default: 0.35)",
    )
    parser.add_argument(
        "--profile",
        choices=sorted(PROFILE_RULES.keys()),
        default="general",
        help="content profile for first-draft density checks",
    )
    parser.add_argument("--min-h2", type=int, default=3)
    parser.add_argument("--max-h2", type=int, default=5)
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.is_file():
        print(f"error: input file not found: {input_path}", file=sys.stderr)
        return 2

    baseline_text: str | None = None
    baseline_path: Path | None = None
    if args.baseline:
        baseline_path = Path(args.baseline).resolve()
        if not baseline_path.is_file():
            print(f"error: baseline file not found: {baseline_path}", file=sys.stderr)
            return 2
        baseline_text = baseline_path.read_text(encoding="utf-8")

    text = input_path.read_text(encoding="utf-8")
    metrics, issues = analyze(
        text,
        args.min_h2,
        args.max_h2,
        baseline_text,
        args.shrink_threshold,
        args.profile,
    )
    errors = [i for i in issues if i.level == "error"]

    payload = {
        "input": str(input_path),
        "baseline": str(baseline_path) if baseline_path else None,
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
