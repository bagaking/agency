GO ?= go
GOLANGCI_LINT ?= golangci-lint
export CODEX_HOME := $(PWD)/.codex
export CODEX_HOME_PUB := $(PWD)/.codex_pub

.PHONY: lint build

# Lint/check basics: catches unused imports via build and common vet checks
lint:
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

codex-locale:
	@echo "CODEX_HOME=$(CODEX_HOME)"
	@echo "Running codex with CODEX_HOME=$(CODEX_HOME)"
	codex --dangerously-bypass-approvals-and-sandbox

codex-locale-resume:
	@echo "CODEX_HOME=$(CODEX_HOME)"
	@echo "Running codex with CODEX_HOME=$(CODEX_HOME)"
	codex --dangerously-bypass-approvals-and-sandbox resume

codex-locale-pub:
	@echo "CODEX_HOME=$(CODEX_HOME_PUB)"
	@echo "Running codex with CODEX_HOME=$(CODEX_HOME_PUB)"
	codex --dangerously-bypass-approvals-and-sandbox