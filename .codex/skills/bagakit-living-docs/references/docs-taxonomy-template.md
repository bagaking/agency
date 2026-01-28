# Docs Taxonomy Guidelines (Template)

## Scope
This document defines the `docs/` taxonomy: categories, naming rules, and frontmatter templates.

## Categories (Non-System Docs)
- Norms: `norms-*.md`
- Architecture: `architecture-*.md`
- Guidelines: `guidelines-*.md`
- Notes: `notes-*.md`
- Runbook (optional): `runbook-*.md`
- Manual test (optional): `manual-test-*.md`

## System Docs
All system-level docs use the `must-` prefix to signal mandatory reading and prevent naming conflicts.

Required system docs:
- `must-guidebook.md`: reading map and doc index
- `must-sop.md`: generated SOP output (do not hand-edit)
- `must-docs-taxonomy.md`: this file

## Naming Rules (Non-System Docs)
Use lowercase kebab-case filenames with the category first: `<type>-<topic>.md`.
Example: `norms-dev.md`, `notes-voice-input.md`, `guidelines-ui-components.md`.

## Frontmatter Templates
All non-system docs must include frontmatter with `title`, `required`, and `sop` fields.

### Norms
```
---
title: <Norms Title>
required: true
sop:
  - Read this doc before touching the affected area.
  - Update this doc when rules or constraints change.
  - Regenerate must-sop.md after updating this doc.
---
```

### Architecture
```
---
title: <Architecture Title>
required: false
sop:
  - Read this doc before architecture changes or refactors.
  - Update this doc when components or boundaries change.
  - Regenerate must-sop.md after updating this doc.
---
```

### Guidelines
```
---
title: <Guidelines Title>
required: false
sop:
  - Follow this doc when implementing or reviewing related UI/UX or engineering patterns.
  - Update this doc when conventions change.
  - Regenerate must-sop.md after updating this doc.
---
```

### Notes
```
---
title: <Notes Title>
required: false
sop:
  - Read this doc when working on the related feature area.
  - Update this doc when implementation details or gotchas change.
  - Regenerate must-sop.md after updating this doc.
---
```

### Runbook (optional)
```
---
title: <Runbook Title>
required: false
sop:
  - Read this doc before operational changes or incident response.
  - Update this doc when procedures or tooling change.
  - Regenerate must-sop.md after updating this doc.
---
```

### Manual Test (optional)
```
---
title: <Manual Test Title>
required: false
sop:
  - Run this checklist before release or when related features change.
  - Update this doc when verification steps change.
  - Regenerate must-sop.md after updating this doc.
---
```

## System Doc Frontmatter (Optional)
If the project enforces frontmatter on all docs, use:
```
---
title: <System Doc Title>
required: true
sop:
  - Keep this system doc aligned with doc taxonomy and project changes.
---
```
