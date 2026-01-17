## ADDED Requirements
### Requirement: Dev Renderer Port Discovery
The editor SHALL avoid hard-coding a dev renderer port and MUST discover the active renderer URL when running against a dev server.
The default dev renderer port MUST NOT be 5173.

#### Scenario: Dev server on non-default port
- **WHEN** the dev renderer runs on a non-default port
- **THEN** the editor locates and loads the active dev renderer URL

### Requirement: Packaged Renderer Override
The editor SHALL allow packaged builds to load a dev renderer URL when explicitly configured for local development.

#### Scenario: Packaged build with renderer override
- **WHEN** a packaged build is launched with an explicit renderer URL override
- **THEN** the editor loads the configured renderer URL
