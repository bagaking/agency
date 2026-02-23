# Inbox (Unreviewed Memory)

This directory holds *candidate* memory items captured during work (tasks/PRs/incidents).

Rules:
- Treat these notes as unreviewed. They may be incomplete or wrong.
- Promote durable items into `../memory/` after review.

Filename rule:
- Use kind-first: `<kind>-<topic>.md` (e.g. `decision-ci-gate.md`).

Helper commands:
- Resolve tooling: `export BAGAKIT_LIVING_DOCS_SKILL_DIR="${BAGAKIT_LIVING_DOCS_SKILL_DIR:-${BAGAKIT_HOME:-$HOME/.bagakit}/skills/bagakit-living-docs}"`
- New: `sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-inbox.sh" new <kind> <topic> --root . --title '<title>'`
- Skill suggestion: `sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-inbox.sh" suggest-skill <create|update> <skill-name> --root . --kind decision --title '<title>' --evidence '<command/log/path>'`
- List: `sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-inbox.sh" list --root .`
- Promote: `sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-inbox.sh" promote docs/.bagakit/inbox/<file>.md --root .`
