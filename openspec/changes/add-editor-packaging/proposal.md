# Change: Add Agency Editor packaging workflow

## Why
The editor needs a repeatable, documented packaging workflow so contributors can build and install a macOS app locally.

## What Changes
- Add packaging scripts and Makefile targets for the Agency Editor.
- Produce macOS artifacts (DMG/ZIP) in a dedicated output directory.
- Document packaging and installation steps.

## Impact
- Affected specs: agency-editor
- Affected code: apps/editor/package.json, Makefile, apps/editor/README.md
