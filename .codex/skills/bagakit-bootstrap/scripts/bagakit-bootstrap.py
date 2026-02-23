#!/usr/bin/env python3
"""Bootstrap bagakit skills via parameter-driven install, copy, and link commands."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_ORG = "bagakit"
DEFAULT_REF = "main"
DEFAULT_DEST_FALLBACK = "~/.codex/skills"
DEFAULT_INSTALLER_URL_TEMPLATE = (
    "https://raw.githubusercontent.com/{org}/skills/{ref}/scripts/install-bagakit-skills.sh"
)
DEFAULT_CATALOG_URL_TEMPLATE = (
    "https://raw.githubusercontent.com/{org}/skills/{ref}/catalog/skills.json"
)
DEFAULT_PROJECT_CATALOG_URL_TEMPLATE = (
    "https://raw.githubusercontent.com/{org}/skills/{ref}/catalog/project-skills.json"
)
DEFAULT_CORE_SKILLS = [
    "bagakit-living-docs",
    "bagakit-feat-task-harness",
    "bagakit-long-run",
]
DEFAULT_CANDIDATE_ROOTS = [
    "~/.codex/skills",
    "~/.bagakit/skills",
]
SOURCE_REMOTE = "remote"
SOURCE_LOCAL_COPY = "local-copy"
SOURCE_LOCAL_LINK = "local-link"
SOURCE_CHOICES = [SOURCE_REMOTE, SOURCE_LOCAL_COPY, SOURCE_LOCAL_LINK]


@dataclass(frozen=True)
class SkillRecord:
    skill_id: str
    relative_path: str
    source: str  # core | project
    repo: str | None = None
    branch: str | None = None
    commit: str | None = None


def eprint(message: str) -> None:
    print(message, file=sys.stderr)


def die(message: str, code: int = 1) -> int:
    eprint(f"error: {message}")
    return code


def resolve_root(raw: str) -> Path:
    return Path(raw).expanduser().resolve()


def resolve_path(root: Path, raw: str) -> Path:
    value = Path(raw).expanduser()
    if not value.is_absolute():
        value = root / value
    return value.resolve()


def split_skill_values(raw_values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in raw_values:
        for chunk in raw.split(","):
            item = chunk.strip()
            if not item or item in seen:
                continue
            seen.add(item)
            out.append(item)
    return out


def choose_selection(all_flag: bool, skill_values: list[str]) -> tuple[str, list[str]]:
    skills = split_skill_values(skill_values)
    if all_flag and skills:
        raise ValueError("use either --all or --skill, not both")
    if all_flag:
        return "all", []
    if skills:
        return "selected", skills
    return "core", []


def normalize_detect_skills(raw_values: list[str]) -> list[str]:
    values = split_skill_values(raw_values)
    if values:
        return values
    return list(DEFAULT_CORE_SKILLS)


def list_candidate_roots(root: Path, raw_values: list[str]) -> list[Path]:
    candidates: list[Path] = []
    seen: set[str] = set()

    from_env = None
    env_value = os.environ.get("BAGAKIT_SKILLS_DIR", "").strip()
    if env_value:
        from_env = resolve_path(root, env_value)

    ordered: list[Path] = []
    if from_env is not None:
        ordered.append(from_env)
    ordered.extend(resolve_path(root, item) for item in raw_values)
    ordered.extend(resolve_path(root, item) for item in DEFAULT_CANDIDATE_ROOTS)

    for item in ordered:
        key = str(item)
        if key in seen:
            continue
        seen.add(key)
        candidates.append(item)
    return candidates


def has_skill_marker(root: Path, skill: str) -> bool:
    return (root / skill / "SKILL.md").is_file()


def has_any_bagakit_skill(root: Path) -> bool:
    if not root.is_dir():
        return False
    for child in root.iterdir():
        if not child.is_dir():
            continue
        if not child.name.startswith("bagakit-"):
            continue
        if (child / "SKILL.md").is_file():
            return True
    return False


def detect_existing_root(candidates: list[Path], detect_skills: list[str]) -> tuple[Path | None, str]:
    for root in candidates:
        for skill in detect_skills:
            if has_skill_marker(root, skill):
                return root, f"detected from {skill}"

    for root in candidates:
        if has_any_bagakit_skill(root):
            return root, "detected from existing bagakit-* folders"

    return None, ""


def resolve_dest(
    root: Path,
    dest_raw: str,
    candidates: list[Path],
    detect_skills: list[str],
) -> tuple[Path, str]:
    if dest_raw.lower() != "auto":
        return resolve_path(root, dest_raw), "explicit --dest"

    detected, reason = detect_existing_root(candidates, detect_skills)
    if detected is not None:
        return detected, reason

    if candidates:
        return candidates[0], "fallback to first candidate root"

    return resolve_path(root, DEFAULT_DEST_FALLBACK), "fallback default"


def request_headers(*, accept: str) -> dict[str, str]:
    headers = {
        "Accept": accept,
        "User-Agent": "bagakit-bootstrap/1",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip() or os.environ.get("GH_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def fetch_json_url(url: str, *, optional: bool) -> dict[str, Any] | None:
    req = Request(url, headers=request_headers(accept="application/json"))
    try:
        with urlopen(req, timeout=30) as resp:
            body = resp.read()
    except HTTPError as exc:
        if optional and exc.code == 404:
            return None
        raise RuntimeError(f"failed to fetch catalog ({exc.code}): {url}") from exc
    except URLError as exc:
        raise RuntimeError(f"failed to fetch catalog: {url}: {exc.reason}") from exc

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"invalid JSON catalog payload: {url}") from exc

    if not isinstance(payload, dict):
        raise RuntimeError(f"catalog root must be an object: {url}")
    return payload


def normalize_relative_path(raw: str, *, label: str) -> str:
    value = raw.strip()
    if not value:
        raise RuntimeError(f"missing {label}")
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts:
        raise RuntimeError(f"invalid {label}: {raw}")
    normalized = path.as_posix().strip()
    if not normalized:
        raise RuntimeError(f"invalid {label}: {raw}")
    return normalized


def load_skill_catalog(
    *,
    org: str,
    ref: str,
    catalog_url_template: str,
    project_catalog_url_template: str,
) -> dict[str, SkillRecord]:
    core_url = catalog_url_template.format(org=org, ref=ref)
    core_payload = fetch_json_url(core_url, optional=False)
    assert core_payload is not None

    core_entries = core_payload.get("skills", [])
    if not isinstance(core_entries, list):
        raise RuntimeError(f"catalog skills field must be a list: {core_url}")

    catalog: dict[str, SkillRecord] = {}

    for item in core_entries:
        if not isinstance(item, dict):
            continue
        skill_id = str(item.get("id", "")).strip()
        if not skill_id:
            raise RuntimeError(f"catalog entry missing id: {core_url}")
        rel_path = normalize_relative_path(str(item.get("path", "")), label="path")
        if skill_id in catalog:
            raise RuntimeError(f"duplicate skill id in catalog: {skill_id}")
        catalog[skill_id] = SkillRecord(
            skill_id=skill_id,
            relative_path=rel_path,
            source="core",
            repo=str(item.get("repo", "")).strip() or None,
            branch=str(item.get("branch", "")).strip() or None,
            commit=str(item.get("commit", "")).strip() or None,
        )

    project_url = project_catalog_url_template.format(org=org, ref=ref)
    project_payload = fetch_json_url(project_url, optional=True)
    if isinstance(project_payload, dict):
        project_entries = project_payload.get("project_skills", [])
        if not isinstance(project_entries, list):
            raise RuntimeError(f"project_skills field must be a list: {project_url}")

        for item in project_entries:
            if not isinstance(item, dict):
                continue
            skill_id = str(item.get("id", "")).strip()
            if not skill_id:
                raise RuntimeError(f"project catalog entry missing id: {project_url}")
            if skill_id in catalog:
                raise RuntimeError(f"duplicate skill id across catalogs: {skill_id}")

            submodule_path = normalize_relative_path(str(item.get("submodule_path", "")), label="submodule_path")
            skill_path = normalize_relative_path(str(item.get("skill_path", "")), label="skill_path")
            rel_path = (PurePosixPath(submodule_path) / PurePosixPath(skill_path)).as_posix()
            catalog[skill_id] = SkillRecord(
                skill_id=skill_id,
                relative_path=rel_path,
                source="project",
            )

    if not catalog:
        raise RuntimeError("catalog contains no skills")

    return catalog


def resolve_selected_skill_ids(
    *,
    selection_mode: str,
    selected_skills: list[str],
    catalog: dict[str, SkillRecord],
) -> list[str]:
    if selection_mode == "all":
        return sorted(catalog.keys())

    if selection_mode == "selected":
        missing = [skill for skill in selected_skills if skill not in catalog]
        if missing:
            raise ValueError(f"unknown skill ids: {', '.join(missing)}")
        return list(selected_skills)

    core_ids: list[str] = []
    missing_core: list[str] = []
    for skill in DEFAULT_CORE_SKILLS:
        if skill in catalog:
            core_ids.append(skill)
        else:
            missing_core.append(skill)

    if missing_core:
        eprint(f"warn: core skills not present in catalog: {', '.join(missing_core)}")
    if not core_ids:
        raise ValueError("no core skills available in catalog")
    return core_ids


def build_installer_args(
    *,
    dest: Path,
    org: str,
    ref: str,
    skill_ids: list[str],
    force: bool,
) -> list[str]:
    args = [
        "--dest",
        str(dest),
        "--org",
        org,
        "--ref",
        ref,
    ]
    for skill in skill_ids:
        args.extend(["--skill", skill])
    if force:
        args.append("--force")
    return args


def materialize_installer(
    *,
    org: str,
    ref: str,
    installer_script: str | None,
    installer_url_template: str,
) -> tuple[Path, str, callable[[], None]]:
    if installer_script:
        local = Path(installer_script).expanduser().resolve()
        if not local.is_file():
            raise FileNotFoundError(local)

        def noop() -> None:
            return

        return local, f"local:{local}", noop

    url = installer_url_template.format(org=org, ref=ref)
    req = Request(url, headers=request_headers(accept="text/plain"))
    try:
        with urlopen(req, timeout=30) as resp:
            body = resp.read()
    except HTTPError as exc:
        raise RuntimeError(f"failed to fetch installer ({exc.code}): {url}") from exc
    except URLError as exc:
        raise RuntimeError(f"failed to fetch installer: {url}: {exc.reason}") from exc

    tmp = tempfile.NamedTemporaryFile(prefix="bagakit-installer-", suffix=".sh", delete=False)
    try:
        tmp.write(body)
        tmp.flush()
    finally:
        tmp.close()
    path = Path(tmp.name)
    path.chmod(0o755)

    def cleanup() -> None:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass

    return path, f"remote:{url}", cleanup


def payload_entries(payload_file: Path) -> list[str]:
    try:
        data = json.loads(payload_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"invalid payload file: {payload_file}") from exc

    if data.get("version") != 1:
        raise RuntimeError(f"SKILL_PAYLOAD.json version must be 1: {payload_file}")

    include = data.get("include")
    if not isinstance(include, list) or not include:
        raise RuntimeError(f"SKILL_PAYLOAD include must be a non-empty list: {payload_file}")

    out: list[str] = []
    seen: set[str] = set()
    for raw in include:
        if not isinstance(raw, str) or not raw.strip():
            raise RuntimeError(f"SKILL_PAYLOAD include entries must be non-empty strings: {payload_file}")
        path = PurePosixPath(raw)
        if path.is_absolute() or ".." in path.parts:
            raise RuntimeError(f"SKILL_PAYLOAD include path is invalid: {raw}")
        value = path.as_posix()
        if value in seen:
            continue
        seen.add(value)
        out.append(value)

    if "SKILL.md" not in seen:
        raise RuntimeError(f"SKILL_PAYLOAD include must contain SKILL.md: {payload_file}")

    return out


def remove_path(path: Path) -> None:
    if path.is_symlink() or path.is_file():
        path.unlink(missing_ok=True)
        return
    if path.exists():
        shutil.rmtree(path)


def copy_runtime_payload(source: Path, target: Path) -> None:
    payload_file = source / "SKILL_PAYLOAD.json"
    if not payload_file.is_file():
        raise RuntimeError(f"missing SKILL_PAYLOAD.json: {source}")

    for entry in payload_entries(payload_file):
        src = source / entry
        dst = target / entry
        if not src.exists():
            raise RuntimeError(f"payload entry missing in source: {src}")

        if src.is_dir():
            dst.mkdir(parents=True, exist_ok=True)
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)


def dedupe_paths(paths: list[Path]) -> list[Path]:
    out: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path)
        if key in seen:
            continue
        seen.add(key)
        out.append(path)
    return out


def local_source_candidates(local_root: Path, record: SkillRecord) -> list[Path]:
    candidates: list[Path] = []
    rel = PurePosixPath(record.relative_path)

    candidates.append(local_root / rel.as_posix())
    candidates.append(local_root / record.skill_id)
    candidates.append(local_root / rel.name)

    parts = rel.parts
    if len(parts) >= 2 and parts[0] == "skills":
        candidates.append(local_root / parts[1])

    if len(parts) >= 3 and parts[0] == "projects":
        project = parts[1]
        sub_path = Path(*parts[2:])
        candidates.append(local_root / project / sub_path)
        candidates.append(local_root / project)

    return dedupe_paths(candidates)


def resolve_local_skill_source(local_root: Path, record: SkillRecord) -> Path | None:
    for candidate in local_source_candidates(local_root, record):
        if not candidate.is_dir():
            continue
        if not (candidate / "SKILL.md").is_file():
            continue
        if not (candidate / "SKILL_PAYLOAD.json").is_file():
            continue
        return candidate
    return None


def same_symlink_target(target: Path, source: Path) -> bool:
    if not target.is_symlink():
        return False
    try:
        return target.resolve() == source.resolve()
    except OSError:
        return False


def ensure_directory(path: Path, *, dry_run: bool) -> None:
    if dry_run:
        print(f"[dry-run] mkdir -p {path}")
        return
    path.mkdir(parents=True, exist_ok=True)


def perform_local_sync(
    *,
    source_mode: str,
    dest: Path,
    local_source_root: Path,
    skill_ids: list[str],
    catalog: dict[str, SkillRecord],
    force: bool,
    dry_run: bool,
) -> int:
    copied = 0
    linked = 0
    skipped = 0
    failed = 0

    ensure_directory(dest, dry_run=dry_run)

    for skill_id in skill_ids:
        record = catalog[skill_id]
        source_dir = resolve_local_skill_source(local_source_root, record)
        if source_dir is None:
            print(f"[fail] {skill_id} (missing local source under {local_source_root})")
            failed += 1
            continue

        target = dest / skill_id
        exists = target.exists() or target.is_symlink()

        if source_mode == SOURCE_LOCAL_LINK:
            if same_symlink_target(target, source_dir):
                print(f"[ok]   {skill_id} (already linked)")
                continue

            if exists and not force:
                print(f"[skip] {skill_id} (target exists, use --force)")
                skipped += 1
                continue

            if exists and force:
                if dry_run:
                    print(f"[dry-run] rm -rf {target}")
                else:
                    remove_path(target)

            if dry_run:
                print(f"[dry-run] ln -sfn {source_dir} {target}")
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.symlink_to(source_dir)
            print(f"[link] {skill_id} -> {source_dir}")
            linked += 1
            continue

        # local-copy
        if exists and not force:
            print(f"[skip] {skill_id} (target exists, use --force)")
            skipped += 1
            continue

        if exists and force:
            if dry_run:
                print(f"[dry-run] rm -rf {target}")
            else:
                remove_path(target)

        if dry_run:
            print(f"[dry-run] copy payload {source_dir} -> {target}")
            print(f"[copy] {skill_id}")
            copied += 1
            continue

        try:
            target.mkdir(parents=True, exist_ok=True)
            copy_runtime_payload(source_dir, target)
        except RuntimeError as exc:
            print(f"[fail] {skill_id} ({exc})")
            remove_path(target)
            failed += 1
            continue

        print(f"[copy] {skill_id}")
        copied += 1

    print()
    print(f"mode: {source_mode}")
    print(f"dest: {dest}")
    print(f"source_root: {local_source_root}")
    print(f"skills_selected: {len(skill_ids)}")
    print(f"copied: {copied}")
    print(f"linked: {linked}")
    print(f"skipped: {skipped}")
    print(f"failed: {failed}")

    return 1 if failed > 0 else 0


def resolve_local_source_root(root: Path, raw: str | None) -> Path | None:
    value = raw or os.environ.get("BAGAKIT_LOCAL_SOURCE_ROOT", "").strip()
    if not value:
        return None
    return resolve_path(root, value)


def execute_install_like(args: argparse.Namespace, *, default_force: bool, action: str) -> int:
    root = resolve_root(args.root)
    org = args.org.strip()
    ref = args.ref.strip()
    source_mode = args.source
    if not org:
        return die("--org cannot be empty")
    if not ref:
        return die("--ref cannot be empty")

    try:
        selection_mode, selected_skills = choose_selection(args.all, args.skill)
    except ValueError as exc:
        return die(str(exc))

    detect_skills = normalize_detect_skills(args.detect_from)
    candidates = list_candidate_roots(root, args.candidate_root)
    dest, dest_reason = resolve_dest(root, args.dest, candidates, detect_skills)

    try:
        catalog = load_skill_catalog(
            org=org,
            ref=ref,
            catalog_url_template=args.catalog_url_template,
            project_catalog_url_template=args.project_catalog_url_template,
        )
        selected_skill_ids = resolve_selected_skill_ids(
            selection_mode=selection_mode,
            selected_skills=selected_skills,
            catalog=catalog,
        )
    except (RuntimeError, ValueError) as exc:
        return die(str(exc))

    force = args.force if args.force is not None else default_force

    if source_mode == SOURCE_REMOTE:
        remote_skill_ids = [sid for sid in selected_skill_ids if catalog[sid].source == "core"]
        unsupported = [sid for sid in selected_skill_ids if catalog[sid].source != "core"]
        if unsupported:
            return die(
                "remote source does not support project-scoped skills: "
                + ", ".join(unsupported)
                + "; use --source local-copy or --source local-link"
            )
        if not remote_skill_ids:
            return die("no core skills selected for remote install")

        try:
            installer_path, installer_source, cleanup = materialize_installer(
                org=org,
                ref=ref,
                installer_script=args.installer_script,
                installer_url_template=args.installer_url_template,
            )
        except FileNotFoundError as exc:
            return die(f"installer script not found: {exc}")
        except RuntimeError as exc:
            return die(str(exc))

        installer_args = build_installer_args(
            dest=dest,
            org=org,
            ref=ref,
            skill_ids=remote_skill_ids,
            force=bool(force),
        )
        cmd = ["bash", str(installer_path), *installer_args]

        meta = {
            "action": action,
            "source": source_mode,
            "root": str(root),
            "dest": str(dest),
            "dest_resolution": dest_reason,
            "org": org,
            "ref": ref,
            "selection_mode": selection_mode,
            "selection_skills": selected_skill_ids,
            "force": bool(force),
            "catalog_skill_count": len(catalog),
            "installer_source": installer_source,
            "command": cmd,
        }

        if args.json:
            print(json.dumps(meta, indent=2, ensure_ascii=True))
        else:
            print(f"action: {action}")
            print(f"source: {source_mode}")
            print(f"dest: {dest}")
            print(f"dest_resolution: {dest_reason}")
            print(f"catalog_skill_count: {len(catalog)}")
            print(f"installer_source: {installer_source}")
            print(f"command: {shlex.join(cmd)}")

        if args.dry_run:
            cleanup()
            return 0

        try:
            proc = subprocess.run(cmd, check=False)
        finally:
            cleanup()
        return int(proc.returncode)

    local_source_root = resolve_local_source_root(root, args.local_source_root)
    if local_source_root is None:
        return die("--local-source-root is required for local-copy/local-link (or set BAGAKIT_LOCAL_SOURCE_ROOT)")
    if not local_source_root.is_dir():
        return die(f"local source root is not a directory: {local_source_root}")

    meta = {
        "action": action,
        "source": source_mode,
        "root": str(root),
        "dest": str(dest),
        "dest_resolution": dest_reason,
        "org": org,
        "ref": ref,
        "selection_mode": selection_mode,
        "selection_skills": selected_skill_ids,
        "force": bool(force),
        "catalog_skill_count": len(catalog),
        "local_source_root": str(local_source_root),
    }

    if args.json:
        print(json.dumps(meta, indent=2, ensure_ascii=True))

    return perform_local_sync(
        source_mode=source_mode,
        dest=dest,
        local_source_root=local_source_root,
        skill_ids=selected_skill_ids,
        catalog=catalog,
        force=bool(force),
        dry_run=bool(args.dry_run),
    )


def summarize_destination(dest: Path, skill_ids: list[str]) -> dict[str, Any]:
    present = 0
    linked = 0
    missing = 0
    items: list[dict[str, Any]] = []

    for skill in skill_ids:
        target = dest / skill
        exists = target.exists() or target.is_symlink()
        is_link = target.is_symlink()
        if exists:
            present += 1
        else:
            missing += 1
        if is_link:
            linked += 1

        link_target = None
        if is_link:
            try:
                link_target = str(target.resolve())
            except OSError:
                link_target = str(target)

        items.append(
            {
                "id": skill,
                "exists": exists,
                "is_symlink": is_link,
                "link_target": link_target,
            }
        )

    return {
        "present": present,
        "linked": linked,
        "missing": missing,
        "items": items,
    }


def cmd_install(args: argparse.Namespace) -> int:
    return execute_install_like(args, default_force=False, action="install")


def cmd_update(args: argparse.Namespace) -> int:
    return execute_install_like(args, default_force=True, action="update")


def cmd_status(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    try:
        selection_mode, selected_skills = choose_selection(args.all, args.skill)
    except ValueError as exc:
        return die(str(exc))

    detect_skills = normalize_detect_skills(args.detect_from)
    candidates = list_candidate_roots(root, args.candidate_root)
    dest, reason = resolve_dest(root, args.dest, candidates, detect_skills)

    try:
        catalog = load_skill_catalog(
            org=args.org,
            ref=args.ref,
            catalog_url_template=args.catalog_url_template,
            project_catalog_url_template=args.project_catalog_url_template,
        )
        selected_skill_ids = resolve_selected_skill_ids(
            selection_mode=selection_mode,
            selected_skills=selected_skills,
            catalog=catalog,
        )
    except (RuntimeError, ValueError) as exc:
        return die(str(exc))

    payload = {
        "action": "status",
        "source": args.source,
        "root": str(root),
        "dest": str(dest),
        "dest_resolution": reason,
        "org": args.org,
        "ref": args.ref,
        "selection_mode": selection_mode,
        "selection_skills": selected_skill_ids,
        "candidate_roots": [str(item) for item in candidates],
        "detect_skills": detect_skills,
        "catalog_skill_count": len(catalog),
        "destination_state": summarize_destination(dest, selected_skill_ids),
    }

    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=True))
        return 0

    print(f"root: {payload['root']}")
    print(f"source: {payload['source']}")
    print(f"dest: {payload['dest']}")
    print(f"dest_resolution: {payload['dest_resolution']}")
    print(f"org: {payload['org']}")
    print(f"ref: {payload['ref']}")
    print(f"selection_mode: {payload['selection_mode']}")
    print(f"selected_count: {len(selected_skill_ids)}")
    print(f"catalog_skill_count: {payload['catalog_skill_count']}")
    state = payload["destination_state"]
    print(f"dest_present: {state['present']}")
    print(f"dest_linked: {state['linked']}")
    print("candidate_roots:")
    for item in payload["candidate_roots"]:
        print(f"- {item}")
    return 0


def cmd_skills(args: argparse.Namespace) -> int:
    try:
        catalog = load_skill_catalog(
            org=args.org,
            ref=args.ref,
            catalog_url_template=args.catalog_url_template,
            project_catalog_url_template=args.project_catalog_url_template,
        )
    except RuntimeError as exc:
        return die(str(exc))

    entries = [
        {
            "id": item.skill_id,
            "source": item.source,
            "path": item.relative_path,
            "repo": item.repo,
            "branch": item.branch,
            "commit": item.commit,
        }
        for item in sorted(catalog.values(), key=lambda x: x.skill_id)
    ]

    payload = {
        "action": "skills",
        "org": args.org,
        "ref": args.ref,
        "count": len(entries),
        "skills": entries,
    }

    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=True))
        return 0

    print(f"org: {args.org}")
    print(f"ref: {args.ref}")
    print(f"skill_count: {len(entries)}")
    for entry in entries:
        print(f"- {entry['id']} [{entry['source']}] ({entry['path']})")
    return 0


def add_common_catalog_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--catalog-url-template",
        default=DEFAULT_CATALOG_URL_TEMPLATE,
        help="skills catalog URL template (default: raw.githubusercontent skills.json)",
    )
    parser.add_argument(
        "--project-catalog-url-template",
        default=DEFAULT_PROJECT_CATALOG_URL_TEMPLATE,
        help="project skills catalog URL template (default: raw.githubusercontent project-skills.json)",
    )


def add_common_run_args(parser: argparse.ArgumentParser, *, allow_force_toggle: bool, default_force: bool) -> None:
    parser.add_argument("--root", default=".", help="target project root (default: .)")
    parser.add_argument("--org", default=DEFAULT_ORG, help=f"skill org/user (default: {DEFAULT_ORG})")
    parser.add_argument("--ref", default=DEFAULT_REF, help=f"skill git ref (default: {DEFAULT_REF})")
    parser.add_argument(
        "--dest",
        default="auto",
        help="install destination directory; use 'auto' to detect existing install root (default: auto)",
    )
    parser.add_argument(
        "--source",
        choices=SOURCE_CHOICES,
        default=SOURCE_REMOTE,
        help="install source mode: remote | local-copy | local-link",
    )
    parser.add_argument(
        "--local-source-root",
        default=None,
        help="local source root for local-copy/local-link modes",
    )
    parser.add_argument("--all", action="store_true", help="operate on all catalog skills")
    parser.add_argument(
        "--skill",
        action="append",
        default=[],
        help="operate on selected skill ids only (repeatable, comma-separated supported)",
    )
    parser.add_argument(
        "--detect-from",
        action="append",
        default=[],
        help="skill ids used by auto destination detection (repeatable, comma-separated supported)",
    )
    parser.add_argument(
        "--candidate-root",
        action="append",
        default=[],
        help="extra candidate destination roots for auto detection (repeatable)",
    )
    parser.add_argument(
        "--installer-script",
        default=None,
        help="use local installer script instead of remote raw URL (remote mode only)",
    )
    parser.add_argument(
        "--installer-url-template",
        default=DEFAULT_INSTALLER_URL_TEMPLATE,
        help="remote installer URL template (default: raw.githubusercontent path)",
    )
    add_common_catalog_args(parser)
    if allow_force_toggle:
        parser.add_argument("--force", dest="force", action="store_true", default=default_force, help="overwrite existing skill dirs")
        parser.add_argument("--no-force", dest="force", action="store_false", help="do not overwrite existing skill dirs")
    else:
        parser.add_argument("--force", action="store_true", default=default_force, help="overwrite existing skill dirs")
    parser.add_argument("--dry-run", action="store_true", help="print resolved command/actions without executing")
    parser.add_argument("--json", action="store_true", help="print structured metadata before execution")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parameter-driven bootstrap for bagakit skill install/update"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    install = sub.add_parser("install", help="install skills with explicit parameters")
    add_common_run_args(install, allow_force_toggle=False, default_force=False)
    install.set_defaults(func=cmd_install)

    update = sub.add_parser("update", help="update skills in the same or detected destination")
    add_common_run_args(update, allow_force_toggle=True, default_force=True)
    update.set_defaults(func=cmd_update)

    sync = sub.add_parser("sync", help="alias of update")
    add_common_run_args(sync, allow_force_toggle=True, default_force=True)
    sync.set_defaults(func=cmd_update)

    status = sub.add_parser("status", help="show resolved destination and selection without execution")
    status.add_argument("--root", default=".", help="target project root (default: .)")
    status.add_argument("--org", default=DEFAULT_ORG, help=f"skill org/user (default: {DEFAULT_ORG})")
    status.add_argument("--ref", default=DEFAULT_REF, help=f"skill git ref (default: {DEFAULT_REF})")
    status.add_argument(
        "--dest",
        default="auto",
        help="destination directory or auto detection mode (default: auto)",
    )
    status.add_argument(
        "--source",
        choices=SOURCE_CHOICES,
        default=SOURCE_REMOTE,
        help="preview source mode",
    )
    status.add_argument("--all", action="store_true", help="selection preview: all")
    status.add_argument(
        "--skill",
        action="append",
        default=[],
        help="selection preview: selected skills (repeatable, comma-separated supported)",
    )
    status.add_argument(
        "--detect-from",
        action="append",
        default=[],
        help="skill ids used by auto destination detection",
    )
    status.add_argument(
        "--candidate-root",
        action="append",
        default=[],
        help="extra candidate roots for auto detection",
    )
    add_common_catalog_args(status)
    status.add_argument("--json", action="store_true", help="emit JSON output")
    status.set_defaults(func=cmd_status)

    skills = sub.add_parser("skills", help="list available skills from remote catalog")
    skills.add_argument("--org", default=DEFAULT_ORG, help=f"skill org/user (default: {DEFAULT_ORG})")
    skills.add_argument("--ref", default=DEFAULT_REF, help=f"skill git ref (default: {DEFAULT_REF})")
    add_common_catalog_args(skills)
    skills.add_argument("--json", action="store_true", help="emit JSON output")
    skills.set_defaults(func=cmd_skills)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
