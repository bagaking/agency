#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/bagakit_update.sh status [--root <project_root>] [--skill-dir <dir>] [--repo <git_url>] [--branch <name>]
  sh scripts/bagakit_update.sh apply  [--root <project_root>] [--skill-dir <dir>] [--overwrite]
  sh scripts/bagakit_update.sh update-skill [--skill-dir <dir>] [--branch <name>]

Purpose:
- `status`: check the latest commit on the remote main branch and compare (when possible).
- `apply`: (re)apply Bagakit living-docs scaffolding into the target project.
- `update-skill`: update the local skill checkout (only when you explicitly ask for it).

Notes:
- This script does not auto-update anything. You must run `update-skill` explicitly.
- Comparison requires `git`.
- Local-vs-remote comparison is only possible when the resolved skill dir is a git checkout (has `.git/`).
- `apply` always replaces the AGENTS managed block only (between `<!-- BAGAKIT:LIVEDOCS:START -->` and `<!-- BAGAKIT:LIVEDOCS:END -->`).
- `apply --overwrite` overwrites doc templates too (it passes `--force` to the skill apply script).

Resolution order for skill dir:
1) --skill-dir <dir>
2) $BAGAKIT_SKILL_DIR
3) $CODEX_HOME/skills/bagakit-living-docs
4) ~/.codex/skills/bagakit-living-docs
EOF
  exit 1
}

cmd=${1:-status}
case "$cmd" in
  status|apply|update-skill) shift || true ;;
  -h|--help|"") usage ;;
  *) echo "error: unknown command: $cmd" >&2; usage ;;
esac

root="."
skill_dir=""
repo=""
branch="main"
overwrite=0

while [ $# -gt 0 ]; do
  case "$1" in
    --root)
      shift; [ $# -gt 0 ] || usage
      root=$1
      ;;
    --skill-dir)
      shift; [ $# -gt 0 ] || usage
      skill_dir=$1
      ;;
    --repo)
      shift; [ $# -gt 0 ] || usage
      repo=$1
      ;;
    --branch)
      shift; [ $# -gt 0 ] || usage
      branch=$1
      ;;
    --overwrite)
      overwrite=1
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      usage
      ;;
  esac
  shift
done

resolve_skill_dir() {
  if [ -n "${skill_dir:-}" ]; then
    printf '%s\n' "$skill_dir"
    return 0
  fi
  if [ -n "${BAGAKIT_SKILL_DIR:-}" ]; then
    printf '%s\n' "$BAGAKIT_SKILL_DIR"
    return 0
  fi
  codex_home="${CODEX_HOME:-$HOME/.codex}"
  printf '%s\n' "$codex_home/skills/bagakit-living-docs"
}

sd=$(resolve_skill_dir)
apply="$sd/scripts/apply-living-docs.sh"

root_abs=$(cd "$root" 2>/dev/null && pwd) || { echo "error: invalid --root: $root" >&2; exit 2; }

has_git() {
  command -v git >/dev/null 2>&1
}

is_git_checkout() {
  [ -d "$sd/.git" ] && has_git
}

local_head() {
  is_git_checkout || return 1
  git -C "$sd" rev-parse HEAD 2>/dev/null
}

origin_url() {
  is_git_checkout || return 1
  git -C "$sd" remote get-url origin 2>/dev/null
}

remote_head() {
  r=$1
  b=$2
  has_git || return 1
  git ls-remote "$r" "refs/heads/$b" 2>/dev/null | awk 'NR==1{print $1}'
}

case "$cmd" in
  status)
    echo "root: $root_abs"
    echo "skill_dir: $sd"
    if [ ! -d "$sd" ]; then
      echo "skill_dir_status: missing (not a directory)"
    elif [ ! -f "$apply" ]; then
      echo "skill_dir_status: incomplete (missing apply script: $apply)"
    else
      echo "skill_dir_status: ok"
    fi

    if is_git_checkout; then
      lh=$(local_head || true)
      echo "skill_local_head: ${lh:-unknown}"
      ru=$(origin_url || true)
      if [ -n "${ru:-}" ]; then
        echo "skill_remote: $ru"
      fi
    else
      echo "skill_local_head: unknown (skill dir is not a git checkout)"
    fi

    r="${repo:-}"
    if [ -z "$r" ]; then
      r=$(origin_url 2>/dev/null || true)
    fi

    if [ -z "${r:-}" ]; then
      echo "skill_remote: unknown (pass --repo <git_url> or use a git checkout with origin)"
      exit 0
    fi

    if ! has_git; then
      echo "skill_remote_head: unknown (git not found)"
      exit 0
    fi

    rh=$(remote_head "$r" "$branch" || true)
    if [ -z "${rh:-}" ]; then
      echo "skill_remote_head: unknown (failed to query remote branch '$branch')"
      exit 0
    fi
    echo "skill_remote_branch: $branch"
    echo "skill_remote_head: $rh"

    lh=$(local_head 2>/dev/null || true)
    if [ -n "${lh:-}" ]; then
      if [ "$lh" = "$rh" ]; then
        echo "status: up-to-date"
      else
        echo "status: differs (local != remote)"
        echo "hint: to inspect updates:"
        echo "  git -C \"$sd\" fetch origin \"$branch\""
        echo "  git -C \"$sd\" log --oneline --decorate --max-count 20 HEAD..origin/$branch"
        echo "hint: to update the skill (explicit):"
        echo "  sh scripts/bagakit_update.sh update-skill --skill-dir \"$sd\" --branch \"$branch\""
        echo "hint: then re-apply into this project:"
        echo "  sh scripts/bagakit_update.sh apply --root \"$root_abs\""
      fi
    else
      echo "status: remote queried; local version unknown (not a git checkout)"
      echo "hint: for a comparable local version, install the skill as a git checkout and set BAGAKIT_SKILL_DIR to it."
    fi
    ;;

  apply)
    if [ ! -f "$apply" ]; then
      echo "error: bagakit skill apply script not found: $apply" >&2
      echo "hint: install the skill into \$CODEX_HOME/skills/bagakit-living-docs, or pass --skill-dir /path/to/bagakit-living-docs" >&2
      exit 2
    fi
    if [ "$overwrite" -eq 1 ]; then
      exec sh "$apply" "$root_abs" --force
    fi
    exec sh "$apply" "$root_abs"
    ;;

  update-skill)
    if ! is_git_checkout; then
      echo "error: cannot update skill: not a git checkout: $sd" >&2
      echo "hint: install the skill as a git checkout, or manage updates manually and pass --skill-dir" >&2
      exit 2
    fi
    git -C "$sd" fetch origin "$branch"
    exec git -C "$sd" pull --ff-only origin "$branch"
    ;;
esac
