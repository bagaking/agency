## 1. Dev Renderer Discovery
- [ ] 1.1 Define a renderer dev server discovery strategy (port file or port scan).
- [ ] 1.2 Update dev scripts to launch Vite without hard-coded 5173.
- [ ] 1.3 Update Electron to resolve renderer URL via discovery when not explicitly set.

## 2. Packaged Override
- [ ] 2.1 Allow packaged builds to use a configured renderer URL for local dev.
- [ ] 2.2 Document the override mechanism for internal use.

## 3. Tests & Tooling
- [ ] 3.1 Update Playwright configs/tests to use the discovered renderer URL.
- [ ] 3.2 Update any wait-on assumptions to track the actual port.
