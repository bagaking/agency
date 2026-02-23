---
name: bagakit-bootstrap
description: Bootstrap Bagakit series skills with parameter-driven install, local copy/link, and update commands. Use when a project needs remote-catalog-driven discovery, same-directory update, and SSOT-friendly local linking without local state files.
---

# Bagakit Bootstrap

## Purpose

- Provide standalone-first install/copy/link/update commands for Bagakit series skills.
- Avoid hidden local state files and rely on explicit command parameters.
- Support auto destination detection so updates can reuse the same install directory.
- Keep remote catalog (`bagakit/skills`) as capability SSOT for skill ids.

## When to Use This Skill

- User asks to install Bagakit series skills quickly with clear command parameters.
- User asks to update installed skills in the same directory without manual path lookup.
- User asks to link local skills so destination stays always latest.
- User asks to switch org/ref/selection directly from CLI flags.

## When NOT to Use This Skill

- User only needs one-off coding help and does not need reusable install/update tooling.
- User asks for mandatory hard coupling with another skill flow.
- User asks for implementation changes inside a specific skill instead of bootstrap orchestration.

## Scope Boundary

- This skill manages install/update command orchestration only.
- It does not manage downstream workflow logic inside installed skills.
- Cross-skill interaction stays optional through contract/signal style inputs (flags/env), never required direct flow-calls.

## Workflow

1. Discover available skills from remote catalog.

```bash
sh scripts/bagakit-bootstrap.sh skills --org bagakit --ref main
```

2. Ask operator whether local skill source already exists.
   - If local source exists, recommend `--source local-link` first (SSOT, always latest).
   - If local source does not exist, recommend `--source remote` and then update strategy.
   - If operator wants local snapshot copy instead of symlink, use `--source local-copy`.

3. Install with explicit parameters (confirm before execution).

```bash
sh scripts/bagakit-bootstrap.sh install --root . --dest ~/.codex/skills --ref main
```

4. Update using automatic destination detection.

```bash
sh scripts/bagakit-bootstrap.sh update --root . --dest auto
```

5. Preview detection result and execution selection before running.

```bash
sh scripts/bagakit-bootstrap.sh status --root . --dest auto --json
```

6. For local SSOT link mode (confirm before execution):

```bash
sh scripts/bagakit-bootstrap.sh update \
  --source local-link \
  --local-source-root /path/to/local-skills-root \
  --dest auto
```

## Command Contracts

- `install`: execute operation with user-provided parameters (default no force overwrite).
- `update`: execute operation with update semantics (default `--force` and same-directory auto detection).
- `sync`: alias of `update`.
- `status`: print resolved destination, selection, and candidate roots without execution.
- `skills`: list available skill ids from remote catalog.

Selection rules:
- default selection is `core` (no `--all`/`--skill`).
- `--all` installs all discovered skills.
- `--skill` (repeatable or comma-separated) installs only selected skills.

Destination detection rules:
- `--dest auto` enables detection.
- Detection scans candidate roots for known skill markers.
- If no marker is found, fallback uses first candidate root (or default skill root).

Source mode rules:
- `--source remote`: remote pull (core skills only).
- `--source local-copy`: copy runtime payload from local source root.
- `--source local-link`: symlink destination to local source root (preferred when local source exists and SSOT is desired).

## Output Routes and Default Mode

- Deliverable archetype: bootstrap-operations.
- action-handoff: resolved installer command + resolved destination path.
- memory-handoff: command stdout/stderr logs in current terminal session (no file persistence by design).
- archive: operator command history and explicit `status --json` snapshot when needed.

Default mode:
- Source default is `remote`.
- Installer is fetched from remote URL template (`--installer-url-template`) using `org/ref`.
- If remote fetch is unavailable, use `--installer-script <local-script>` as standalone fallback.

## Archive Gate

Before marking bootstrap work complete:

- action-handoff destination is explicit (resolved `dest` path shown by command output).
- memory-handoff destination is explicit (terminal output or captured CI log path).
- next operation is explicit (`update`/`sync` command with same parameter set is ready).
- operator confirmation has been explicitly captured before destructive overwrite/link replacement.

## Optional Cross-Skill Contract

- Optional signal inputs: `--candidate-root`, `--detect-from`, `BAGAKIT_SKILLS_DIR`.
- Optional signal inputs: `--local-source-root`, `BAGAKIT_LOCAL_SOURCE_ROOT`.
- Optional signal output: `status --json` and `skills --json` payloads for external orchestration readers.
- No mandatory direct flow-call to any other skill.

## Fallback Path (No Clear Fit)

- If install root policy is ambiguous, ask one clarification question about preferred destination.
- If user has local source and local-link is acceptable, prefer linking for SSOT.
- If user has no local source, check current destination state via `status --json` and suggest `update` when stale/unknown.
- If remote fetch fails, pass local installer script and continue in standalone mode.

## `[[BAGAKIT]]` Footer

```text
[[BAGAKIT]]
- Bootstrap: Status=<in_progress|done|blocked>; HardGate=<pass|fail>; WarnGate=<count>; AgentGate=<approve|revise>; Evidence=<install/update/status checks>; Next=<next command>
```
