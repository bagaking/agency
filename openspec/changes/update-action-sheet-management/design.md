# Design: Action Sheet Management + Modal System

## Goal
Ship Action Sheet lifecycle controls and align confirmations with a unified modal system.

## Modal System
### Structure
- Provide a global modal host at the application root.
- Expose a hook (`useModal`) with `confirm` and `notify` tiers.
- Use a single visual language: blurred overlay, gradient glow, and tier-specific tone.

### Tiers
- **Notice**: short-lived, auto-dismiss informational modal with a single dismiss button.
- **Confirm**: blocking choice with explicit cancel/confirm actions.

### Usage Rules
- All new confirmations and system notices MUST use the global modal system.
- Legacy modals can remain until migrated, but new flows should not use `window.confirm`.

## Action Sheet Delete
- Replace the native confirm with the modal system.
- After deletion, ensure Action Sheet panels disappear when the sheet no longer exists.

## Embedded Missing State
- Draft/Promote views hide the Action Sheet panel if the linked sheet is missing.

## Draft Lifecycle Controls
- Draft archive updates the HIL item status and refreshes the dock/state.
- Draft delete removes the HIL item from the index and local artifacts with confirmation.
