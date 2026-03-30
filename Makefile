GO ?= go
GOLANGCI_LINT ?= golangci-lint
PNPM ?= pnpm
export CODEX_HOME := $(PWD)/.codex
export CODEX_HOME_PUB := $(PWD)/.codex_pub

.PHONY: lint build editor-install editor-dev editor-test editor-test-unit editor-test-e2e editor-package editor-package-clean editor-package-lite editor-package-dir

# Lint/check basics: catches unused imports via build and common vet checks
lint:
	$(PNPM) run check:governed-js
	@if command -v $(GOLANGCI_LINT) >/dev/null 2>&1; then \
		$(GOLANGCI_LINT) run; \
	else \
		echo "$(GOLANGCI_LINT) not installed; skipping golangci-lint"; \
	fi
	$(GO) vet ./...
	$(GO) build ./...

# Convenience: full build
build:
	$(GO) build ./...

editor-install:
	cd apps/editor && $(PNPM) install

editor-dev:
	cd apps/editor && $(PNPM) run dev

editor-test: editor-test-unit editor-test-e2e

editor-test-unit:
	cd apps/editor && $(PNPM) run test:unit

editor-test-e2e:
	cd apps/editor && $(PNPM) run test:e2e

editor-package:
	cd apps/editor && $(PNPM) run package

editor-package-clean:
	cd apps/editor && $(PNPM) run package:clean

editor-package-lite:
	cd apps/editor && $(PNPM) run package:lite

editor-package-dir:
	cd apps/editor && $(PNPM) run package:dir

codex-locale:
	@echo "CODEX_HOME=$(CODEX_HOME)"
	@echo "Running codex with CODEX_HOME=$(CODEX_HOME)"
	codex -m gpt-5.3-codex -c model_reasoning_effort="xhigh" -c model_reasoning_summary_format=experimental --search --dangerously-bypass-approvals-and-sandbox

codex-locale-resume:
	@echo "CODEX_HOME=$(CODEX_HOME)"
	@echo "Running codex with CODEX_HOME=$(CODEX_HOME)"
	codex -m gpt-5.3-codex -c model_reasoning_effort="xhigh" -c model_reasoning_summary_format=experimental --search --dangerously-bypass-approvals-and-sandbox resume 

codex-locale-pub:
	@echo "CODEX_HOME=$(CODEX_HOME_PUB)"
	@echo "Running codex with CODEX_HOME=$(CODEX_HOME_PUB)"
	codex --dangerously-bypass-approvals-and-sandbox
