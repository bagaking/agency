#!/usr/bin/env python3
"""Brainstorm artifact manager for bagakit-brainstorm."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


STATUS_RE = re.compile(r"(?im)^-\s*Status:\s*(pending|in_progress|complete|blocked)\s*$")
CLARIFICATION_STATUS_RE = re.compile(r"(?im)^-\s*Clarification status:\s*(pending|in_progress|complete|blocked)\s*$")
LEGACY_STATUS_RE = re.compile(r"(?im)\*\*Status:\*\*\s*(pending|in_progress|complete|blocked)\s*$")
FRONTMATTER_STATUS_RE = re.compile(r"(?im)^stage_status:\s*(pending|in_progress|complete|blocked)\s*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SEMANTIC_VERSION_DIR_RE = re.compile(r"^v([1-9][0-9]*)-[A-Za-z0-9\u4e00-\u9fff]+(?:-[A-Za-z0-9\u4e00-\u9fff]+)*$")
PLAIN_VERSION_DIR_RE = re.compile(r"^v([1-9][0-9]*)$")
LEGACY_CANDIDATE_FILE_RE = re.compile(r"(?i)^candidate-v([1-9][0-9]*)\.md$")
REQUIRED_STAGES: tuple[tuple[str, str], ...] = (
    ("input_and_qa", "input_and_qa.md"),
    ("finding_and_analyze", "finding_and_analyze.md"),
    ("expert_forum_review", "expert_forum.md"),
    ("outcome_and_handoff", "outcome_and_handoff.md"),
)
OPTIONAL_STAGES: tuple[tuple[str, str], ...] = (
    ("related_insights", "related_insights.md"),
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def utc_day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def utc_compact_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    if not value:
        raise SystemExit("error: slug became empty after normalization")
    return value


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def brainstorm_root(root: Path) -> Path:
    return root / ".bagakit" / "brainstorm"


def runs_root(root: Path) -> Path:
    return brainstorm_root(root) / "runs"


def archive_root(root: Path) -> Path:
    return brainstorm_root(root) / "archive"


def classify_artifact_scope(root: Path, artifact_dir: Path) -> str:
    if archive_root(root) in artifact_dir.parents:
        return "archive"
    if runs_root(root) in artifact_dir.parents:
        return "runs"
    return "external"


def ensure_unique_dir(path: Path) -> Path:
    if not path.exists():
        return path
    index = 2
    while True:
        candidate = path.with_name(f"{path.name}-{index}")
        if not candidate.exists():
            return candidate
        index += 1


def resolve_latest_artifact(root: Path, include_archive: bool = False) -> Path:
    run_candidates: list[Path] = []
    base_runs = runs_root(root)
    if base_runs.is_dir():
        run_candidates = [p for p in base_runs.iterdir() if p.is_dir()]
    if run_candidates:
        run_candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return run_candidates[0]

    if include_archive:
        archive_candidates: list[Path] = []
        base_archive = archive_root(root)
        if base_archive.is_dir():
            archive_candidates = [p for p in base_archive.iterdir() if p.is_dir()]
        if archive_candidates:
            archive_candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return archive_candidates[0]

    raise SystemExit(f"error: no artifact directory under {brainstorm_root(root)}")


def resolve_archived_counterpart(root: Path, artifact_name: str) -> Path | None:
    candidate = archive_root(root) / artifact_name
    if candidate.is_dir():
        return candidate
    return None


def resolve_artifact_dir(root: Path, dir_arg: str | None, allow_archive_lookup: bool) -> Path:
    if not dir_arg:
        return resolve_latest_artifact(root, include_archive=allow_archive_lookup)

    candidate = Path(dir_arg).expanduser().resolve()
    if candidate.is_dir():
        return candidate

    if allow_archive_lookup:
        archived = resolve_archived_counterpart(root, candidate.name)
        if archived is not None:
            return archived

    raise SystemExit(f"error: artifact directory not found: {candidate}")


def split_legacy_artifact_name(name: str) -> tuple[str, str]:
    parts = name.split("-", 3)
    if len(parts) >= 4 and DATE_RE.match("-".join(parts[:3])):
        return "-".join(parts[:3]), parts[3]
    return utc_day(), name


def artifact_slug(artifact_name: str) -> str:
    if "--" in artifact_name:
        candidate = artifact_name.split("--", 1)[1].strip()
        if candidate:
            return candidate
    _, fallback_slug = split_legacy_artifact_name(artifact_name)
    return fallback_slug


def render_template(src: Path, dst: Path, replacements: dict[str, str]) -> None:
    text = read_text(src)
    for key, value in replacements.items():
        text = text.replace(key, value)
    write_text(dst, text)


def extract_frontmatter(text: str) -> str | None:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            return "\n".join(lines[1:index])
    return None


def markdown_body_without_frontmatter(text: str) -> str:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return text
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            return "\n".join(lines[index + 1 :])
    return text


def frontmatter_scalar(frontmatter: str, key: str) -> str | None:
    pattern = re.compile(rf"(?im)^{re.escape(key)}:\s*(.*?)\s*$")
    match = pattern.search(frontmatter)
    if not match:
        return None
    return match.group(1).strip()


def frontmatter_list_count(frontmatter: str, key: str) -> int:
    lines = frontmatter.splitlines()
    count = 0
    collecting = False
    key_indent = 0
    for line in lines:
        if not collecting:
            key_match = re.match(rf"^(\s*){re.escape(key)}:\s*$", line)
            if key_match:
                collecting = True
                key_indent = len(key_match.group(1))
            continue

        if not line.strip():
            continue

        indent = len(line) - len(line.lstrip(" "))
        if indent <= key_indent and re.match(r"^\s*[A-Za-z0-9_-]+\s*:", line):
            break
        if re.match(r"^\s*-\s+", line):
            count += 1
    return count


def frontmatter_named_values(frontmatter: str, nested_key: str) -> list[str]:
    return [match.group(1).strip() for match in re.finditer(rf"(?im)^\s*{re.escape(nested_key)}:\s*(.+?)\s*$", frontmatter)]


def heading_exists(text: str, heading: str) -> bool:
    return re.search(rf"(?im)^#{{1,6}}\s+{re.escape(heading)}\s*$", text) is not None


def score_row_count(text: str) -> int:
    return len(re.findall(r"(?m)^\|\s*[^|\n]+\s*\|\s*[^|\n]+\s*\|\s*(?:10|[0-9])(?:\.[0-9]+)?\s*\|", text))


def url_count(text: str) -> int:
    return len(re.findall(r"https?://[^\s)]+", text))


def experiment_count(artifact_dir: Path) -> int:
    experimental_root = artifact_dir / "experimental"
    if not experimental_root.is_dir():
        return 0
    return sum(1 for path in experimental_root.iterdir() if path.is_dir())


def experiment_bonus_points(artifact_dir: Path) -> int:
    count = experiment_count(artifact_dir)
    if count <= 0:
        return 0
    return min(5, count)


def semantic_version_index(dir_name: str) -> int | None:
    match = SEMANTIC_VERSION_DIR_RE.match(dir_name)
    if not match:
        return None
    return int(match.group(1))


def version_delta_scalar(text: str, key: str) -> str | None:
    match = re.search(rf"(?im)^-\s*{re.escape(key)}:\s*(.+?)\s*$", text)
    if not match:
        return None
    return match.group(1).strip()


def section_bullets(text: str, heading: str) -> list[str]:
    match = re.search(rf"(?ims)^##\s+{re.escape(heading)}\s*$\n(.*?)(?=^##\s+|\Z)", text)
    if not match:
        return []
    return [item.group(1).strip() for item in re.finditer(r"(?m)^\s*-\s+(.+?)\s*$", match.group(1))]


def has_relative_optimizations(text: str) -> bool:
    return len(section_bullets(text, "Relative Optimizations")) > 0


def references_prior_techniques(bullets: list[str], previous_version_name: str) -> bool:
    previous_hint = previous_version_name.lower()
    for bullet in bullets:
        lower = bullet.lower()
        if previous_hint not in lower:
            continue
        if "technique" in lower or "summary" in lower or "技巧" in bullet or "总结" in bullet:
            return True
    return False


def experiment_version_policy_issues(artifact_dir: Path) -> list[str]:
    experimental_root = artifact_dir / "experimental"
    if not experimental_root.is_dir():
        return []

    issues: list[str] = []
    experiment_dirs = sorted([path for path in experimental_root.iterdir() if path.is_dir()], key=lambda p: p.name)
    for experiment_dir in experiment_dirs:
        versions_dir = experiment_dir / "versions"
        if versions_dir.is_dir():
            issues.append(
                f"{rel(artifact_dir, versions_dir)} is not allowed; place version folders directly under {rel(artifact_dir, experiment_dir)} using vN-semantic naming"
            )

        for entry in sorted(experiment_dir.iterdir(), key=lambda p: p.name):
            if entry.is_file() and LEGACY_CANDIDATE_FILE_RE.match(entry.name):
                issues.append(
                    f"{rel(artifact_dir, entry)} uses legacy candidate-vN file naming; use {rel(artifact_dir, experiment_dir)}/vN-semantic-description/ instead"
                )

        direct_semantic_versions: list[tuple[int, Path]] = []
        direct_plain_versions: list[Path] = []
        for entry in sorted(experiment_dir.iterdir(), key=lambda p: p.name):
            if not entry.is_dir():
                continue
            index = semantic_version_index(entry.name)
            if index is not None:
                direct_semantic_versions.append((index, entry))
                continue
            if PLAIN_VERSION_DIR_RE.match(entry.name):
                direct_plain_versions.append(entry)

        for plain_dir in direct_plain_versions:
            issues.append(
                f"{rel(artifact_dir, plain_dir)} must include semantic suffix; expected format: vN-semantic-description"
            )

        nested_version_dirs = sorted(
            [
                path
                for path in experiment_dir.rglob("*")
                if path.is_dir()
                and path.parent != experiment_dir
                and (semantic_version_index(path.name) is not None or PLAIN_VERSION_DIR_RE.match(path.name) is not None)
            ],
            key=lambda p: str(p),
        )
        for path in nested_version_dirs:
            issues.append(
                f"{rel(artifact_dir, path)} must be moved to {rel(artifact_dir, experiment_dir)}/ as a direct child directory"
            )

        if not direct_semantic_versions:
            continue

        direct_semantic_versions.sort(key=lambda item: (item[0], item[1].name))
        indexes = [item[0] for item in direct_semantic_versions]
        if indexes[0] != 1:
            issues.append(
                f"{rel(artifact_dir, experiment_dir)} version chain must start at v1-semantic-description"
            )
        for prev_idx, curr_idx in zip(indexes, indexes[1:]):
            if curr_idx != prev_idx + 1:
                issues.append(
                    f"{rel(artifact_dir, experiment_dir)} version numbers must be contiguous; found gap between v{prev_idx} and v{curr_idx}"
                )

        seen_indexes: set[int] = set()
        for index in indexes:
            if index in seen_indexes:
                issues.append(
                    f"{rel(artifact_dir, experiment_dir)} has duplicate semantic directories for v{index}; keep one directory per version number"
                )
            seen_indexes.add(index)

        semantic_by_index = {index: path for index, path in direct_semantic_versions}
        for index, version_dir in direct_semantic_versions:
            delta_file = version_dir / "version_delta.md"
            if not delta_file.is_file():
                issues.append(f"missing required file: {rel(artifact_dir, delta_file)}")
                continue

            delta_text = read_text(delta_file)
            declared_version = version_delta_scalar(delta_text, "version")
            if declared_version != version_dir.name:
                issues.append(
                    f"{rel(artifact_dir, delta_file)} must declare '- version: {version_dir.name}'"
                )

            declared_based_on = version_delta_scalar(delta_text, "based_on")
            if index == 1:
                if declared_based_on is None or declared_based_on.lower() != "none":
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must declare '- based_on: none' for v1 baseline"
                    )
            else:
                previous_dir = semantic_by_index.get(index - 1)
                if previous_dir is None:
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} cannot validate based_on because v{index-1} directory is missing"
                    )
                elif declared_based_on != previous_dir.name:
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must declare '- based_on: {previous_dir.name}'"
                    )
                baseline_bullets = section_bullets(delta_text, "Baseline Techniques Read")
                if not baseline_bullets:
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must include '## Baseline Techniques Read' with at least one bullet"
                    )
                elif previous_dir is not None and not references_prior_techniques(baseline_bullets, previous_dir.name):
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} Baseline Techniques Read must reference {previous_dir.name} techniques summary"
                    )
                if not section_bullets(delta_text, "New Techniques Introduced"):
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must include '## New Techniques Introduced' with at least one bullet"
                    )
                if not has_relative_optimizations(delta_text):
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must include '## Relative Optimizations' with at least one bullet"
                    )
                if not section_bullets(delta_text, "No-Regression Guards"):
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must include '## No-Regression Guards' with at least one bullet"
                    )
                if not section_bullets(delta_text, "Regression Check"):
                    issues.append(
                        f"{rel(artifact_dir, delta_file)} must include '## Regression Check' with at least one bullet"
                    )

    return issues


def expert_forum_gate_issues(expert_forum_file: Path, artifact_dir: Path) -> list[str]:
    if not expert_forum_file.is_file():
        return [f"missing required file {expert_forum_file.name}"]

    text = read_text(expert_forum_file)
    frontmatter = extract_frontmatter(text)
    if frontmatter is None:
        return ["missing yaml frontmatter in expert_forum.md"]
    body_text = markdown_body_without_frontmatter(text)

    issues: list[str] = []
    stage_status = frontmatter_scalar(frontmatter, "stage_status")
    if stage_status not in {"pending", "in_progress", "complete", "blocked"}:
        issues.append("frontmatter stage_status is missing or invalid")

    forum_mode = frontmatter_scalar(frontmatter, "forum_mode")
    valid_modes = {"deep_dive_forum", "lightning_talk_forum", "industry_readout_forum"}
    if forum_mode is None:
        issues.append("frontmatter forum_mode is missing")
        forum_mode = ""
    elif forum_mode not in valid_modes:
        issues.append("frontmatter forum_mode must be deep_dive_forum, lightning_talk_forum, or industry_readout_forum")

    discussion_clear = frontmatter_scalar(frontmatter, "discussion_clear")
    if discussion_clear is None:
        issues.append("frontmatter discussion_clear is missing")
    elif discussion_clear.lower() != "true":
        issues.append("frontmatter discussion_clear must be true")

    user_review_status = frontmatter_scalar(frontmatter, "user_review_status")
    valid_user_review_status = {"pending", "approved", "changes_requested"}
    if user_review_status is None:
        issues.append("frontmatter user_review_status is missing")
    else:
        normalized_status = user_review_status.lower()
        if normalized_status not in valid_user_review_status:
            issues.append("frontmatter user_review_status must be pending, approved, or changes_requested")
        elif normalized_status != "approved":
            issues.append("frontmatter user_review_status must be approved before completion")

    final_one_liner = frontmatter_scalar(frontmatter, "final_one_liner")
    if final_one_liner is None:
        issues.append("frontmatter final_one_liner is missing")
    elif final_one_liner.strip() in {"", '""', "''", "TBD", "tbd"}:
        issues.append("frontmatter final_one_liner must be a concrete sentence")

    participants_count = frontmatter_list_count(frontmatter, "participants")
    if participants_count < 3:
        issues.append("participants must contain at least 3 experts")

    key_issues_count = frontmatter_list_count(frontmatter, "key_issues")
    if key_issues_count < 1:
        issues.append("key_issues must contain at least 1 item")

    key_insights_count = frontmatter_list_count(frontmatter, "key_insights")
    if key_insights_count < 1:
        issues.append("key_insights must contain at least 1 item")

    personas = [match.group(1).strip().lower() for match in re.finditer(r"(?im)^\s*persona:\s*(.+?)\s*$", frontmatter)]
    persona_categories: set[str] = set()
    for persona in personas:
        if "deep" in persona or "rigor" in persona or "system" in persona:
            persona_categories.add("deep")
        if "creative" in persona or "idea" in persona or "explore" in persona:
            persona_categories.add("creative")
        if "challeng" in persona or "critic" in persona or "devil" in persona:
            persona_categories.add("challenger")
    if {"deep", "creative", "challenger"} - persona_categories:
        issues.append("persona mix must cover deep thinker, creative explorer, and constructive challenger")

    for required_heading in ("详细结论", "背景和专家组介绍", "讨论过程"):
        if not heading_exists(body_text, required_heading):
            issues.append(f"required heading missing: {required_heading}")
    if not heading_exists(body_text, "用户评判与确认"):
        issues.append("required heading missing: 用户评判与确认")

    participant_names = frontmatter_named_values(frontmatter, "name")
    for name in participant_names:
        if name and name not in body_text:
            issues.append(f"participant name not referenced in report body: {name}")

    deep_or_lightning = forum_mode in {"deep_dive_forum", "lightning_talk_forum"}
    if deep_or_lightning:
        if not heading_exists(body_text, "专家检索与证据陈述"):
            issues.append("deep_dive_forum/lightning_talk_forum must include heading: 专家检索与证据陈述")
        if not heading_exists(body_text, "交叉评分（0~10）"):
            issues.append("deep_dive_forum/lightning_talk_forum must include heading: 交叉评分（0~10）")
        if not heading_exists(body_text, "实验设计与本地 MVP"):
            issues.append("deep_dive_forum/lightning_talk_forum must include heading: 实验设计与本地 MVP")
        if not heading_exists(body_text, "MVP验证结果（观点成立/工具可用）"):
            issues.append("deep_dive_forum/lightning_talk_forum must include heading: MVP验证结果（观点成立/工具可用）")
        if not heading_exists(body_text, "实验改动边界（强制）"):
            issues.append("deep_dive_forum/lightning_talk_forum must include heading: 实验改动边界（强制）")
        if "源文改动：禁止" not in body_text and "源文改动: 禁止" not in body_text:
            issues.append("deep_dive_forum/lightning_talk_forum must explicitly declare source edits are forbidden")
        if "仅限 `experimental/`" not in body_text and "仅限 experimental/" not in body_text:
            issues.append("deep_dive_forum/lightning_talk_forum must declare all experiment edits are limited to experimental/")
        if "观点成立验证" not in body_text:
            issues.append("deep_dive_forum/lightning_talk_forum experiments must include claim validation evidence")
        if "工具可用验证" not in body_text:
            issues.append("deep_dive_forum/lightning_talk_forum experiments must include tool usability evidence")
        if url_count(body_text) < max(1, participants_count):
            issues.append("deep_dive_forum/lightning_talk_forum require at least one cited URL per participant")
        if score_row_count(body_text) < max(1, participants_count):
            issues.append("deep_dive_forum/lightning_talk_forum require peer scoring rows with 0~10 scores")

    if experiment_bonus_points(artifact_dir) > 0 and not heading_exists(body_text, "实验附加分（1~5）"):
        issues.append("local experiments detected, but heading missing: 实验附加分（1~5）")
    for issue in experiment_version_policy_issues(artifact_dir):
        issues.append(f"experiment version policy: {issue}")

    return issues


def read_status(path: Path) -> str:
    if not path.is_file():
        return "missing"
    text = read_text(path)
    frontmatter = extract_frontmatter(text)
    if frontmatter is not None:
        match = FRONTMATTER_STATUS_RE.search(frontmatter)
        if match:
            return match.group(1)
    match = STATUS_RE.search(text)
    if match:
        return match.group(1)
    legacy = LEGACY_STATUS_RE.search(text)
    if legacy:
        return legacy.group(1)
    return "unknown"


def clarification_status(path: Path) -> str:
    if not path.is_file():
        return "missing"
    text = read_text(path)
    match = CLARIFICATION_STATUS_RE.search(text)
    if not match:
        return "unknown"
    return match.group(1)


def input_and_qa_gate_issues(input_and_qa_file: Path) -> list[str]:
    if not input_and_qa_file.is_file():
        return [f"missing required file {input_and_qa_file.name}"]

    text = read_text(input_and_qa_file)
    issues: list[str] = []
    status = clarification_status(input_and_qa_file)
    if status == "unknown":
        issues.append("input_and_qa Clarification status is missing or invalid")
    elif status != "complete":
        issues.append("input_and_qa Clarification status must be complete before completion")

    if not heading_exists(text, "Clarification Loop"):
        issues.append("input_and_qa missing required heading: Clarification Loop")
    return issues


@dataclass
class StageItem:
    name: str
    file_name: str
    required: bool
    status: str


@dataclass
class StageSummary:
    items: list[StageItem]
    required_total: int
    required_complete: int
    next_stage: str


def summarize_stages(artifact_dir: Path) -> StageSummary:
    items: list[StageItem] = []
    for name, file_name in REQUIRED_STAGES:
        items.append(StageItem(name=name, file_name=file_name, required=True, status=read_status(artifact_dir / file_name)))
    for name, file_name in OPTIONAL_STAGES:
        status = read_status(artifact_dir / file_name)
        if status != "missing":
            items.append(StageItem(name=name, file_name=file_name, required=False, status=status))

    required_total = sum(1 for item in items if item.required)
    required_complete = sum(1 for item in items if item.required and item.status == "complete")
    next_stage = "all_required_stages_complete"
    for item in items:
        if item.required and item.status != "complete":
            next_stage = item.name
            break

    return StageSummary(items=items, required_total=required_total, required_complete=required_complete, next_stage=next_stage)


def detect_driver_systems(root: Path) -> list[str]:
    systems: list[str] = []
    if (root / ".bagakit" / "ft-harness" / "index" / "feats.json").is_file():
        systems.append("feat-harness")
    if (root / "openspec" / "changes").is_dir():
        systems.append("openspec")
    return systems


def auto_feat_id(root: Path) -> str | None:
    index_file = root / ".bagakit" / "ft-harness" / "index" / "feats.json"
    if not index_file.is_file():
        return None
    try:
        data = json.loads(read_text(index_file))
    except json.JSONDecodeError:
        return None
    feats = data.get("feats", [])
    if not isinstance(feats, list):
        return None

    preferred = [item for item in feats if isinstance(item, dict) and item.get("status") in {"in_progress", "ready"}]
    pool = preferred if preferred else [item for item in feats if isinstance(item, dict)]
    if not pool:
        return None
    pool.sort(key=lambda item: str(item.get("updated_at", "")), reverse=True)
    for item in pool:
        feat_id = str(item.get("feat_id", "")).strip()
        if feat_id:
            return feat_id
    return None


def resolve_feat_dir(root: Path, feat_id: str) -> Path | None:
    for candidate in (
        root / ".bagakit" / "ft-harness" / "feats" / feat_id,
        root / ".bagakit" / "ft-harness" / "feats-archived" / feat_id,
    ):
        if candidate.is_dir():
            return candidate
    return None


def auto_change_id(root: Path) -> str | None:
    changes_root = root / "openspec" / "changes"
    if not changes_root.is_dir():
        return None
    dirs = [p for p in changes_root.iterdir() if p.is_dir()]
    if not dirs:
        return None
    dirs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return dirs[0].name


def detect_living_docs(root: Path) -> bool:
    return (root / "docs" / ".bagakit" / "inbox").is_dir()


def load_topic(artifact_dir: Path, fallback_slug: str) -> str:
    input_file = artifact_dir / "input_and_qa.md"
    if input_file.is_file():
        lines = read_text(input_file).splitlines()
        if lines:
            first_line = lines[0].strip()
            if first_line.startswith("# Input and QA:"):
                candidate = first_line.replace("# Input and QA:", "", 1).strip()
                if candidate and not candidate.startswith("{{"):
                    return candidate

    legacy_task_plan = artifact_dir / "task_plan.md"
    if legacy_task_plan.is_file():
        lines = read_text(legacy_task_plan).splitlines()
        if lines:
            first_line = lines[0].strip()
            if first_line.startswith("# Task Plan:"):
                candidate = first_line.replace("# Task Plan:", "", 1).strip()
                if candidate and not candidate.startswith("{{"):
                    return candidate
    return fallback_slug.replace("-", " ")


def choose_local_action_path(root: Path, slug: str) -> Path:
    return brainstorm_root(root) / "outcome" / f"brainstorm-handoff-{slug}.md"


def choose_local_memory_path(root: Path, slug: str) -> Path:
    return choose_local_action_path(root, slug)


def write_local_outcome(action_path: Path, topic: str, root: Path, artifact_dir: Path) -> None:
    outcome_source = artifact_dir / "outcome_and_handoff.md"
    analysis_source = artifact_dir / "finding_and_analyze.md"
    forum_source = artifact_dir / "expert_forum.md"
    input_source = artifact_dir / "input_and_qa.md"
    outcome_body = read_text(outcome_source) if outcome_source.is_file() else "No outcome_and_handoff.md found in artifact source."
    content = (
        f"# Brainstorm Handoff ({topic})\n\n"
        f"> Generated by bagakit-brainstorm fallback route.\n"
        f"> Source artifact: `{rel(root, artifact_dir)}`\n"
        "> Completion scope: analysis_and_handoff_only\n\n"
        "## Source Files\n"
        f"- input_and_qa: `{rel(root, input_source)}`\n"
        f"- finding_and_analyze: `{rel(root, analysis_source)}`\n"
        f"- expert_forum: `{rel(root, forum_source)}`\n"
        f"- outcome_and_handoff: `{rel(root, outcome_source)}`\n\n"
        f"## Outcome and Handoff\n\n{outcome_body}\n"
        "## Memory Summary\n"
        "- Input assumptions and constraints were captured and clarified.\n"
        "- Options were compared with a decision matrix and explicit fallback.\n"
        "- Expert forum evidence, scoring, and MVP notes were recorded.\n"
        "- Handoff destinations and completion gates were archived.\n"
    )
    write_text(action_path, content)


def write_driver_handoff(action_path: Path, topic: str, root: Path, artifact_dir: Path, target: str) -> None:
    outcome_source = artifact_dir / "outcome_and_handoff.md"
    finding_source = artifact_dir / "finding_and_analyze.md"
    forum_source = artifact_dir / "expert_forum.md"
    content = (
        f"# Brainstorm Handoff ({topic})\n\n"
        f"- Target: `{target}`\n"
        f"- Source outcome: `{rel(root, outcome_source)}`\n"
        f"- Source analysis: `{rel(root, finding_source)}`\n\n"
        f"- Source forum: `{rel(root, forum_source)}`\n\n"
        "## Checklist\n"
        "- [ ] Confirm scope boundaries and assumptions\n"
        "- [ ] Confirm expert forum conclusion and scoring rationale\n"
        "- [ ] Consume handoff checklist in outcome file\n"
        "- [ ] Feed execution results back to durable memory\n"
    )
    write_text(action_path, content)


def write_living_docs_inbox(memory_path: Path, topic: str, slug: str, root: Path, artifact_dir: Path) -> None:
    now = utc_now_iso()
    outcome_source = rel(root, artifact_dir / "outcome_and_handoff.md")
    analysis_source = rel(root, artifact_dir / "finding_and_analyze.md")
    forum_source = rel(root, artifact_dir / "expert_forum.md")
    content = f"""---
title: Brainstorm summary: {topic}
kind: howto
status: inbox
tags:
  - brainstorm
  - analysis
sources:
  - {outcome_source}
  - {analysis_source}
  - {forum_source}
created: {now}
---

## Candidate
- Topic: {topic}
- Brainstorm analysis and handoff artifacts are complete.
- Promote stable decision rules if reused repeatedly.

## Promote To
- `docs/.bagakit/memory/howto-brainstorm-{slug}.md` (curated), or
- `docs/brainstorm-summary-{slug}.md` (normative/deep)
"""
    write_text(memory_path, content)


def write_local_summary(memory_path: Path, topic: str, root: Path, artifact_dir: Path) -> None:
    outcome_source = artifact_dir / "outcome_and_handoff.md"
    analysis_source = artifact_dir / "finding_and_analyze.md"
    forum_source = artifact_dir / "expert_forum.md"
    content = (
        f"# Brainstorm Summary ({topic})\n\n"
        f"- Source outcome: `{rel(root, outcome_source)}`\n"
        f"- Source analysis: `{rel(root, analysis_source)}`\n\n"
        f"- Source forum: `{rel(root, forum_source)}`\n\n"
        "## Key Points\n"
        "- Input and constraints validated.\n"
        "- Options compared with an explicit decision matrix.\n"
        "- Expert forum reviewed references and cross-scoring.\n"
        "- Outcome/handoff documented with explicit destination.\n"
    )
    write_text(memory_path, content)


def resolve_archive_json_path(root: Path, artifact_dir: Path) -> Path:
    direct = artifact_dir / "archive.json"
    if direct.is_file():
        return direct
    counterpart = archive_root(root) / artifact_dir.name / "archive.json"
    return counterpart


def cmd_init(args: argparse.Namespace) -> int:
    topic = args.topic.strip()
    if not topic:
        raise SystemExit("error: --topic is required")

    slug = args.slug or slugify(topic)
    goal = args.goal or f"Deliver a validated brainstorm analysis and handoff for {topic}."
    source_hint = args.source_hint or "Provide markdown files or inline snippets."
    date = utc_day()

    root = Path(args.root).expanduser().resolve()
    artifact_name = f"{utc_compact_stamp()}--{slug}"
    artifact_dir = ensure_unique_dir(runs_root(root) / artifact_name)
    artifact_dir.mkdir(parents=True, exist_ok=False)

    replacements = {
        "{{TOPIC}}": topic,
        "{{GOAL}}": goal,
        "{{SOURCE_HINT}}": source_hint,
        "{{DATE}}": date,
    }
    template_dir = Path(__file__).resolve().parents[1] / "references" / "tpl"
    created_files: list[Path] = []
    for template_name, output_name in (
        ("input_and_qa.md", "input_and_qa.md"),
        ("finding_and_analyze.md", "finding_and_analyze.md"),
        ("expert_forum.md", "expert_forum.md"),
        ("outcome_and_handoff.md", "outcome_and_handoff.md"),
    ):
        output = artifact_dir / output_name
        render_template(template_dir / template_name, output, replacements)
        created_files.append(output)

    if args.with_related_insights:
        output = artifact_dir / "related_insights.md"
        render_template(template_dir / "related_insights.md", output, replacements)
        created_files.append(output)
    print(f"created={artifact_dir}")
    print("files:")
    for file in created_files:
        print(f"  - {file}")
    print("next=fill input_and_qa.md, then finding_and_analyze.md, then expert_forum.md, then outcome_and_handoff.md")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    root = Path(args.root).expanduser().resolve()
    artifact_dir = resolve_artifact_dir(root, args.dir, allow_archive_lookup=True)
    summary = summarize_stages(artifact_dir)
    expert_forum_file = artifact_dir / "expert_forum.md"
    input_and_qa_file = artifact_dir / "input_and_qa.md"
    expert_forum_issues = expert_forum_gate_issues(artifact_dir / "expert_forum.md", artifact_dir)
    input_and_qa_issues = input_and_qa_gate_issues(input_and_qa_file)
    clarification = clarification_status(input_and_qa_file)
    experiment_items = experiment_count(artifact_dir)
    bonus_points = experiment_bonus_points(artifact_dir)
    version_policy_issues = experiment_version_policy_issues(artifact_dir)
    forum_mode = "unknown"
    user_review_status = "unknown"
    if expert_forum_file.is_file():
        frontmatter = extract_frontmatter(read_text(expert_forum_file))
        if frontmatter is not None:
            forum_mode = frontmatter_scalar(frontmatter, "forum_mode") or "unknown"
            user_review_status = frontmatter_scalar(frontmatter, "user_review_status") or "unknown"
    archive_json = resolve_archive_json_path(root, artifact_dir)
    archive_status = "missing"
    if archive_json.is_file():
        try:
            archive_status = str(json.loads(read_text(archive_json)).get("status", "unknown"))
        except json.JSONDecodeError:
            archive_status = "invalid-json"

    print(f"artifact_dir={artifact_dir}")
    print(f"artifact_scope={classify_artifact_scope(root, artifact_dir)}")
    print(f"required_total={summary.required_total}")
    print(f"required_complete={summary.required_complete}")
    print(f"next_stage={summary.next_stage}")
    print(f"input_and_qa_clarification_status={clarification}")
    print(f"input_and_qa_gate={'pass' if not input_and_qa_issues else 'fail'}")
    for issue in input_and_qa_issues:
        print(f"input_and_qa_issue={issue}")
    for item in summary.items:
        print(f"stage_{item.name}={item.status}")
    print(f"expert_forum_mode={forum_mode}")
    print(f"expert_forum_user_review_status={user_review_status}")
    print(f"expert_forum_gate={'pass' if not expert_forum_issues else 'fail'}")
    for issue in expert_forum_issues:
        print(f"expert_forum_issue={issue}")
    print(f"experiment_count={experiment_items}")
    print(f"experiment_bonus_points={bonus_points}")
    print(f"experiment_version_policy={'pass' if not version_policy_issues else 'fail'}")
    for issue in version_policy_issues:
        print(f"experiment_version_issue={issue}")
    print(f"archive_status={archive_status}")
    return 0


def cmd_archive(args: argparse.Namespace) -> int:
    root = Path(args.root).expanduser().resolve()
    artifact_dir = resolve_artifact_dir(root, args.dir, allow_archive_lookup=True)

    missing_required = [file_name for _, file_name in REQUIRED_STAGES if not (artifact_dir / file_name).is_file()]
    if missing_required:
        raise SystemExit(f"error: missing required artifact file(s): {', '.join(missing_required)}")

    slug = args.slug or artifact_slug(artifact_dir.name)
    topic = args.topic or load_topic(artifact_dir, slug)
    systems = detect_driver_systems(root)
    living_docs = detect_living_docs(root)

    selected_driver = args.driver
    if selected_driver == "auto":
        if "feat-harness" in systems:
            selected_driver = "feat-harness"
        elif "openspec" in systems:
            selected_driver = "openspec"
        else:
            selected_driver = "local"

    unresolved_reasons: list[str] = []
    action_target = "local-outcome"
    action_path: Path | None = None
    feat_id = args.feat_id
    change_id = args.change_id
    stage_summary = summarize_stages(artifact_dir)
    required_stages_complete = stage_summary.required_complete == stage_summary.required_total
    if not required_stages_complete:
        unresolved_reasons.append(
            f"required stages incomplete: {stage_summary.required_complete}/{stage_summary.required_total}"
        )
        for item in stage_summary.items:
            if item.required and item.status != "complete":
                unresolved_reasons.append(f"required stage not complete: {item.name}={item.status}")
    input_and_qa_issues = input_and_qa_gate_issues(artifact_dir / "input_and_qa.md")
    input_and_qa_clear = not input_and_qa_issues
    for issue in input_and_qa_issues:
        unresolved_reasons.append(f"input_and_qa_gate: {issue}")
    expert_forum_issues = expert_forum_gate_issues(artifact_dir / "expert_forum.md", artifact_dir)
    expert_forum_clear = not expert_forum_issues
    user_review_approved = False
    expert_forum_file = artifact_dir / "expert_forum.md"
    if expert_forum_file.is_file():
        frontmatter = extract_frontmatter(read_text(expert_forum_file))
        if frontmatter is not None:
            user_review_approved = (frontmatter_scalar(frontmatter, "user_review_status") or "").lower() == "approved"
    for issue in expert_forum_issues:
        unresolved_reasons.append(f"expert_forum_gate: {issue}")

    if selected_driver == "feat-harness":
        if "feat-harness" not in systems:
            unresolved_reasons.append("driver feat-harness selected but system not detected")
        feat_id = feat_id or auto_feat_id(root)
        if not feat_id:
            unresolved_reasons.append("feat-harness detected but feat_id is unresolved")
        else:
            feat_dir = resolve_feat_dir(root, feat_id)
            if feat_dir is None:
                unresolved_reasons.append(f"feat_id {feat_id} not found in .bagakit/ft-harness/feats*")
            else:
                action_target = f"bagakit-feat-task-harness:{feat_id}"
                action_path = feat_dir / f"brainstorm-handoff-{slug}.md"
    elif selected_driver == "openspec":
        if "openspec" not in systems:
            unresolved_reasons.append("driver openspec selected but system not detected")
        change_id = change_id or auto_change_id(root)
        if not change_id:
            unresolved_reasons.append("openspec detected but change_id is unresolved")
        else:
            change_dir = root / "openspec" / "changes" / change_id
            if not change_dir.is_dir():
                unresolved_reasons.append(f"change_id {change_id} not found under openspec/changes")
            else:
                action_target = f"openspec:{change_id}"
                action_path = change_dir / f"brainstorm-handoff-{slug}.md"
    else:
        action_target = "local-outcome"
        action_path = choose_local_action_path(root, slug)

    if living_docs:
        memory_target = "bagakit-living-docs:inbox"
        memory_path = root / "docs" / ".bagakit" / "inbox" / f"howto-brainstorm-{slug}.md"
    elif action_target == "local-outcome":
        memory_target = "local-outcome-unified"
        memory_path = action_path if action_path is not None else choose_local_action_path(root, slug)
    else:
        memory_target = "local-summary"
        memory_path = choose_local_memory_path(root, slug)

    if action_path is not None and not unresolved_reasons:
        if action_target == "local-outcome":
            write_local_outcome(action_path, topic, root, artifact_dir)
        else:
            write_driver_handoff(action_path, topic, root, artifact_dir, action_target)

    if not unresolved_reasons:
        if living_docs:
            write_living_docs_inbox(memory_path, topic, slug, root, artifact_dir)
        elif action_target != "local-outcome":
            write_local_summary(memory_path, topic, root, artifact_dir)

    complete = not unresolved_reasons and action_path is not None and memory_path.is_file()
    moved = False
    original_artifact = artifact_dir
    if complete and classify_artifact_scope(root, artifact_dir) != "archive":
        target_dir = archive_root(root) / artifact_dir.name
        if target_dir.exists():
            unresolved_reasons.append(f"archive destination already exists: {target_dir}")
            complete = False
        else:
            target_dir.parent.mkdir(parents=True, exist_ok=True)
            artifact_dir.rename(target_dir)
            artifact_dir = target_dir
            moved = True

    status = "complete" if complete else "blocked"
    action_path_str = rel(root, action_path) if action_path else "<unresolved>"
    memory_path_str = rel(root, memory_path)
    action_destination_resolved = action_path is not None
    memory_destination_resolved = memory_path.is_file()
    experiment_items = experiment_count(artifact_dir)
    bonus_points = experiment_bonus_points(artifact_dir)

    archive_md = artifact_dir / "archive.md"
    archive_json = artifact_dir / "archive.json"
    md_lines = [
        f"# Brainstorm Archive ({topic})",
        "",
        f"- status: `{status}`",
        f"- source_artifact: `{rel(root, original_artifact)}`",
        f"- archived_artifact: `{rel(root, artifact_dir)}`",
        f"- artifact_moved: `{str(moved).lower()}`",
        f"- selected_driver: `{selected_driver}`",
        f"- detected_drivers: `{', '.join(systems) if systems else 'none'}`",
        "",
        "## Action Handoff",
        f"- target: `{action_target}`",
        f"- destination: `{action_path_str}`",
        "",
        "## Memory Handoff",
        f"- target: `{memory_target}`",
        f"- destination: `{memory_path_str}`",
        f"- policy: `{'docs/.bagakit/inbox kind=status/sources/created' if living_docs else ('single local handoff under .bagakit/brainstorm/outcome/' if action_target == 'local-outcome' else 'local summary fallback')}`",
        "",
        "## Completion Definition",
        "- Brainstorm completion means analysis and handoff are complete.",
        "- Execution of downstream implementation is out of scope for this completion gate.",
        "",
        "## Archive Gate Checklist",
        f"- [x] Required stages complete: `{str(required_stages_complete).lower()}`",
        f"- [x] Input clarification gate clear: `{str(input_and_qa_clear).lower()}`",
        f"- [x] Expert forum gate clear: `{str(expert_forum_clear).lower()}`",
        f"- [x] User review approved: `{str(user_review_approved).lower()}`",
        f"- [x] Action destination resolved: `{str(action_destination_resolved).lower()}`",
        f"- [x] Memory destination resolved: `{str(memory_destination_resolved).lower()}`",
        f"- [x] Archive record written: `true`",
        f"- [x] Artifact moved to archive on complete: `{str(complete and moved).lower()}`",
        f"- [x] Local experiment count: `{experiment_items}`",
        f"- [x] Experiment bonus points (1~5): `{bonus_points}`",
    ]
    if unresolved_reasons:
        md_lines.extend(["", "## Blocking Reasons", *[f"- {item}" for item in unresolved_reasons]])
    write_text(archive_md, "\n".join(md_lines) + "\n")

    payload = {
        "version": 2,
        "status": status,
        "created_at": utc_now_iso(),
        "topic": topic,
        "source_artifact": rel(root, original_artifact),
        "archived_artifact": rel(root, artifact_dir),
        "artifact_moved": moved,
        "driver": {
            "selected": selected_driver,
            "detected": systems,
            "feat_id": feat_id,
            "change_id": change_id,
        },
        "handoff": {
            "action": {"target": action_target, "path": action_path_str},
            "memory": {"target": memory_target, "path": memory_path_str},
        },
        "checks": {
            "required_stages_complete": required_stages_complete,
            "input_and_qa_gate_clear": input_and_qa_clear,
            "expert_forum_gate_clear": expert_forum_clear,
            "user_review_approved": user_review_approved,
            "action_destination_resolved": action_destination_resolved,
            "memory_destination_resolved": memory_destination_resolved,
            "archive_written": True,
            "artifact_moved_on_complete": complete and (moved or classify_artifact_scope(root, artifact_dir) == "archive"),
            "experiment_count": experiment_items,
            "experiment_bonus_points": bonus_points,
        },
        "blocking_reasons": unresolved_reasons,
    }
    write_text(archive_json, json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

    print(f"archive_dir={artifact_dir}")
    print(f"status={status}")
    print(f"artifact_moved={str(moved).lower()}")
    print(f"action_target={action_target}")
    print(f"action_path={action_path_str}")
    print(f"memory_target={memory_target}")
    print(f"memory_path={memory_path_str}")
    print(f"experiment_count={experiment_items}")
    print(f"experiment_bonus_points={bonus_points}")
    if unresolved_reasons:
        for reason in unresolved_reasons:
            print(f"blocked_reason={reason}")
        return 1
    return 0


def cmd_check_complete(args: argparse.Namespace) -> int:
    root = Path(args.root).expanduser().resolve()
    artifact_dir = resolve_artifact_dir(root, args.dir, allow_archive_lookup=True)
    summary = summarize_stages(artifact_dir)

    if summary.required_total <= 0:
        print("TASK NOT COMPLETE")
        print("required_stage_count=0")
        return 1
    if summary.required_complete != summary.required_total:
        print("TASK NOT COMPLETE")
        print(f"required_stage_complete={summary.required_complete}/{summary.required_total}")
        for item in summary.items:
            if item.required:
                print(f"required_stage_{item.name}={item.status}")
        return 1
    input_and_qa_issues = input_and_qa_gate_issues(artifact_dir / "input_and_qa.md")
    if input_and_qa_issues:
        print("TASK NOT COMPLETE")
        print("input_and_qa_gate=fail")
        for issue in input_and_qa_issues:
            print(f"input_and_qa_issue={issue}")
        return 1
    expert_forum_issues = expert_forum_gate_issues(artifact_dir / "expert_forum.md", artifact_dir)
    if expert_forum_issues:
        print("TASK NOT COMPLETE")
        print("expert_forum_gate=fail")
        for issue in expert_forum_issues:
            print(f"expert_forum_issue={issue}")
        return 1

    archive_json = resolve_archive_json_path(root, artifact_dir)
    if not archive_json.is_file():
        print("TASK NOT COMPLETE")
        print(f"missing_archive={archive_json}")
        return 1

    try:
        archive = json.loads(read_text(archive_json))
    except json.JSONDecodeError:
        print("TASK NOT COMPLETE")
        print(f"invalid_archive_json={archive_json}")
        return 1

    if archive.get("status") != "complete":
        print("TASK NOT COMPLETE")
        print(f"archive_status={archive.get('status', 'unknown')}")
        return 1

    print("ALL REQUIRED STAGES COMPLETE")
    print(f"archive_status={archive.get('status')}")
    print("completion_scope=analysis_and_handoff_only")
    print(f"experiment_count={experiment_count(artifact_dir)}")
    print(f"experiment_bonus_points={experiment_bonus_points(artifact_dir)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="bagakit-brainstorm artifact tooling")
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="create brainstorm analysis artifacts from templates")
    p_init.add_argument("--topic", required=True, help="brainstorm topic")
    p_init.add_argument("--root", default=".", help="project root")
    p_init.add_argument("--slug", help="optional artifact slug")
    p_init.add_argument("--goal", help="optional goal text")
    p_init.add_argument("--source-hint", help="optional source hint")
    p_init.add_argument("--with-related-insights", action="store_true", help="include optional related insights file")
    p_init.add_argument(
        "--with-expert-panel",
        action="store_true",
        help="deprecated no-op: expert forum file is required and always generated",
    )
    p_init.set_defaults(func=cmd_init)

    p_status = sub.add_parser("status", help="show stage and archive status")
    p_status.add_argument("--dir", help="artifact directory")
    p_status.add_argument("--root", default=".", help="project root")
    p_status.set_defaults(func=cmd_status)

    p_archive = sub.add_parser("archive", help="resolve handoff routes, write archive record, and move artifact")
    p_archive.add_argument("--dir", help="artifact directory")
    p_archive.add_argument("--root", default=".", help="project root")
    p_archive.add_argument("--topic", help="topic override")
    p_archive.add_argument("--slug", help="slug override")
    p_archive.add_argument(
        "--driver",
        choices=["auto", "local", "feat-harness", "openspec"],
        default="auto",
        help="action handoff driver",
    )
    p_archive.add_argument("--feat-id", help="target feat id when using feat-harness")
    p_archive.add_argument("--change-id", help="target change id when using openspec")
    p_archive.set_defaults(func=cmd_archive)

    p_complete = sub.add_parser("check-complete", help="require analysis stage completion + archive completion")
    p_complete.add_argument("--dir", help="artifact directory")
    p_complete.add_argument("--root", default=".", help="project root")
    p_complete.set_defaults(func=cmd_check_complete)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
