## ADDED Requirements
### Requirement: Terminal Keyboard Protocol Fidelity
The editor SHALL preserve modifier-specific key sequences for Shift+Enter via a renderer-side handler.
The editor SHALL prefer bracketed-paste newline when bracketed paste mode is enabled.
The editor SHALL avoid collapsing Shift+Enter into plain Enter when the handler is active and no shortcut binding matches.

#### Scenario: Modifier-aware Enter
- **WHEN** a user presses Shift+Enter and no shortcut binding matches
- **THEN** the input stream includes bracketed-paste newline (`\x1b[200~\n\x1b[201~`) if enabled
- **AND** otherwise falls back to CSI-u (`\x1b[13;2u`)
- **AND** CLI tools receive the modifier-aware sequence unchanged

#### Scenario: Fallback to standard Enter
- **WHEN** the handler is not active or a shortcut binding handles the key
- **THEN** the terminal sends standard Enter sequences without additional modifiers
