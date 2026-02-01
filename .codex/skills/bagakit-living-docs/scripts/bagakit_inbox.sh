#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/bagakit_inbox.sh list [--root <dir>]
  sh scripts/bagakit_inbox.sh new <kind> <topic> [--root <dir>] [--title <title>]
  sh scripts/bagakit_inbox.sh promote <inbox-path> [--root <dir>] [--topic <topic>] [--keep] [--merge]

Kinds:
  decision | preference | gotcha | glossary | howto

Notes:
- Default layout stores memory under docs/.bagakit/:
  - Creates inbox entries under: docs/.bagakit/inbox/<kind>-<topic>.md
  - Promotes inbox entries to: docs/.bagakit/memory/<kind>-<topic>.md
- Promotion removes "status: inbox" and ensures updated/confidence fields exist.
EOF
  exit 1
}

cmd=${1:-}
[ -n "${cmd:-}" ] || usage
shift || true

root="."
title=""
topic_override=""
keep=0
merge=0

today() {
  date +%F
}

normalize_rel() {
  # Normalize backslashes and strip leading "./" only (do not strip "../").
  p=$1
  p=$(printf '%s' "$p" | sed -e 's#\\\\#/#g')
  while [ "${p#./}" != "$p" ]; do
    p=${p#./}
  done
  printf '%s\n' "$p"
}

is_kind() {
  case "$1" in
    decision|preference|gotcha|glossary|howto) return 0 ;;
    *) return 1 ;;
  esac
}

slugify() {
  # Lowercase-ish + keep [a-z0-9-]. This is "good enough" for filenames.
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

safe_root() {
  root_abs=$(cd "$root" 2>/dev/null && pwd) || { echo "error: invalid --root: $root" >&2; exit 2; }
  root=$root_abs
}

get_fm_value() {
  # Reads frontmatter key from a file. Only works for simple "key: value" lines.
  key=$1
  file=$2
  awk -v want="$key" '
    NR==1 { if ($0!="---") exit 0; in_fm=1; next }
    in_fm==1 && $0=="---" { exit 0 }
    in_fm==1 {
      if ($0 ~ ("^" want ":[[:space:]]*")) {
        sub(("^" want ":[[:space:]]*"), "", $0)
        gsub(/^["'\''"]|["'\''"]$/, "", $0)
        print $0
        exit 0
      }
    }
  ' "$file"
}

ensure_dir_kind() {
  # Keep name for backward compatibility within this script; now it just ensures base dirs.
  mkdir -p "$root/docs/.bagakit/inbox" "$root/docs/.bagakit/memory"
}

strip_frontmatter() {
  # If the file starts with a '---' frontmatter block, drop it (including both delimiters).
  # This is intentionally minimal and deterministic.
  awk '
    NR==1 {
      if ($0=="---") { in_fm=1; next }
    }
    in_fm==1 && $0=="---" { in_fm=0; next }
    in_fm==1 { next }
    { print }
  ' "$1"
}

upsert_updated_field() {
  # Ensure frontmatter has an "updated:" field and set it to today.
  # If frontmatter is missing, does nothing.
  file=$1
  today=$2
  tmp="$file.tmp.$$"
  awk -v today="$today" '
    BEGIN { in_fm=0; done=0; has_updated=0 }
    NR==1 {
      if ($0=="---") { in_fm=1; print; next }
    }
    in_fm==1 && $0=="---" {
      if (!has_updated) print "updated: " today
      in_fm=0
      done=1
      print
      next
    }
    in_fm==1 {
      if ($0 ~ /^updated:[[:space:]]+/) { print "updated: " today; has_updated=1; next }
      print
      next
    }
    { print }
  ' "$file" >"$tmp"
  mv "$tmp" "$file"
}

case "$cmd" in
  list)
    while [ $# -gt 0 ]; do
      case "$1" in
        --root)
          shift; [ $# -gt 0 ] || usage
          root=$1
          ;;
        -h|--help)
          usage
          ;;
        *)
          break
          ;;
      esac
      shift
    done
    safe_root
    [ -d "$root/docs/.bagakit/inbox" ] || exit 0
    find "$root/docs/.bagakit/inbox" -type f -name "*.md" ! -name "README.md" 2>/dev/null | LC_ALL=C sort | sed "s#^$root/##"
    ;;

  new)
    [ $# -ge 2 ] || usage
    kind=$1
    topic=$2
    shift 2
    while [ $# -gt 0 ]; do
      case "$1" in
        --root)
          shift; [ $# -gt 0 ] || usage
          root=$1
          ;;
        --title)
          shift; [ $# -gt 0 ] || usage
          title=$1
          ;;
        -h|--help)
          usage
          ;;
        *)
          break
          ;;
      esac
      shift
    done
    is_kind "$kind" || { echo "error: unknown kind: $kind" >&2; exit 2; }
    safe_root
    ensure_dir_kind "$kind"

    topic_slug=$(slugify "$topic")
    [ -n "$topic_slug" ] || { echo "error: empty topic" >&2; exit 2; }
    file="$root/docs/.bagakit/inbox/$kind-$topic_slug.md"
    if [ -e "$file" ]; then
      echo "error: already exists: ${file#$root/}" >&2
      exit 2
    fi
    t="${title:-$topic}"
    d=$(today)
    promote_target_hint="docs/.bagakit/memory/$kind-$topic_slug.md"
    cat >"$file" <<EOF
---
title: $t
kind: $kind
status: inbox
tags:
  - $kind
sources:
  - <path/to/file>
  - <link/to/pr-or-issue>
created: $d
---

## Candidate
<Raw note from a task/PR/incident. OK to be messy.>

## Promote To
- \`$promote_target_hint\` (curated), or
- \`docs/<type>-<topic>.md\` (normative/deep guide)
EOF
    echo "write: ${file#$root/}"
    ;;

  promote)
    [ $# -ge 1 ] || usage
    src_rel=$(normalize_rel "$1")
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        --root)
          shift; [ $# -gt 0 ] || usage
          root=$1
          ;;
        --topic)
          shift; [ $# -gt 0 ] || usage
          topic_override=$1
          ;;
        --keep)
          keep=1
          ;;
        --merge)
          merge=1
          ;;
        -h|--help)
          usage
          ;;
        *)
          break
          ;;
      esac
      shift
    done
    safe_root
    case "$src_rel" in
      docs/.bagakit/inbox/*) ;;
      *)
        echo "error: promote expects an inbox path under docs/.bagakit/inbox/: $src_rel" >&2
        exit 2
        ;;
    esac
    src="$root/$src_rel"
    [ -f "$src" ] || { echo "error: file not found: $src_rel" >&2; exit 2; }

    kind=$(get_fm_value "kind" "$src" | tr -d '\r' || true)
    [ -n "${kind:-}" ] || { echo "error: missing frontmatter kind in $src_rel" >&2; exit 2; }
    is_kind "$kind" || { echo "error: unknown kind in $src_rel: $kind" >&2; exit 2; }
    ensure_dir_kind "$kind"

    base=$(basename "$src_rel")
    name=${base%.md}
    # Default topic from filename: strip leading "<kind>-".
    topic="$name"
    case "$topic" in
      "$kind"-*) topic=${topic#"$kind"-} ;;
    esac
    if [ -n "${topic_override:-}" ]; then
      topic=$(slugify "$topic_override")
    else
      topic=$(slugify "$topic")
    fi
    [ -n "$topic" ] || topic="promoted-$(today)"

    dest_rel="docs/.bagakit/memory/$kind-$topic.md"
    dest="$root/$dest_rel"
    if [ -e "$dest" ]; then
      if [ "$merge" -eq 0 ]; then
        echo "error: destination exists: $dest_rel (hint: pass --merge to append into existing file)" >&2
        exit 2
      fi
    fi

    tmp="$dest.tmp.$$"
    d=$(today)
    if [ -e "$dest" ] && [ "$merge" -eq 1 ]; then
      # Merge into existing curated file: update "updated:" and append body from inbox.
      upsert_updated_field "$dest" "$d"
      {
        printf "\n\n## Merged From Inbox\n\n"
        printf "- source: \`%s\`\n" "$src_rel"
        printf "- merged: %s\n\n" "$d"
        strip_frontmatter "$src"
        printf "\n"
      } >>"$dest"
      if [ "$keep" -eq 0 ]; then
        rm -f "$src"
      fi
      echo "merge: $src_rel -> $dest_rel"
      exit 0
    fi

    awk -v today="$d" '
      BEGIN { in_fm=0; has_updated=0; has_conf=0 }
      NR==1 {
        if ($0=="---") { in_fm=1; print; next }
      }
      in_fm==1 && $0=="---" {
        if (!has_conf) print "confidence: low"
        if (!has_updated) print "updated: " today
        in_fm=0
        print
        next
      }
      in_fm==1 {
        if ($0 ~ /^status:[[:space:]]*inbox[[:space:]]*$/) next
        if ($0 ~ /^updated:[[:space:]]+/) has_updated=1
        if ($0 ~ /^confidence:[[:space:]]+/) has_conf=1
        print
        next
      }
      { print }
    ' "$src" >"$tmp"

    mkdir -p "$(dirname "$dest")"
    mv "$tmp" "$dest"
    if [ "$keep" -eq 0 ]; then
      rm -f "$src"
    fi
    echo "promote: $src_rel -> $dest_rel"
    ;;

  *)
    usage
    ;;
esac
