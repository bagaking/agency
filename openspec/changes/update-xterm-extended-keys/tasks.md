## 1. Proposal Validation
- [x] 1.1 Run `openspec validate update-xterm-extended-keys --strict`

## 2. Dependency Upgrade
- [x] 2.1 Replace `xterm` with `@xterm/xterm` in `apps/editor/package.json`
- [x] 2.2 Update `pnpm-lock.yaml` via `pnpm install`
- [x] 2.3 Update CSS import path in `apps/editor/renderer/src/App.jsx`

## 3. Terminal Keyboard Protocol
- [x] 3.1 Add custom Shift+Enter handling with bracketed-paste newline and CSI-u fallback when no shortcut binding matches
- [ ] 3.2 Verify no regressions in terminal input, paste, and shortcuts

## 4. Verification & Experience
- [ ] 4.1 Validate Shift+Enter and modifier input with at least two CLI tools (e.g., codex, claude)
  - Note: as of 2025-02, codex/claude CLI did not respond to CSI-u (Shift+Enter appears ignored).
- [x] 4.2 Record results and guidance in a terminal experience note

## 5. Skill Update
- [x] 5.1 Create `bagaking-xterm-skills` based on the current xterm skill
- [x] 5.2 Add guidance on extended keyboard protocols and Agency terminal defaults
- [x] 5.3 Package the skill (if required) and update references
