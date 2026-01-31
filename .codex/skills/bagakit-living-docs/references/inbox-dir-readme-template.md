# Inbox (Unreviewed Memory)

This directory holds *candidate* memory items captured during work (tasks/PRs/incidents).

Rules:
- Treat these notes as unreviewed. They may be incomplete or wrong.
- Promote durable items into `../memory/` after review.

Filename rule:
- Use kind-first: `<kind>-<topic>.md` (e.g. `decision-ci-gate.md`).

Helper commands:
- New: `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`
- List: `sh scripts/bagakit_inbox.sh list`
- Promote: `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md`

