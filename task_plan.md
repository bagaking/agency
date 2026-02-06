# Task Plan: Unify terminal mouse/selection/shortcut behavior

## Goal
Deliver a terminal interaction model where mouse interaction, modifier key combos (Shift/Ctrl/Command), and selection all work simultaneously, update docs/specs accordingly, and implement in code after approved OpenSpec change.

## Current Phase
Phase 4

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define technical approach
- [x] Create project structure if needed
- [x] Document decisions with rationale
- **Status:** complete

### Phase 3: Implementation
- [x] Execute the plan step by step
- [x] Write code to files before executing
- [ ] Test incrementally
- **Status:** complete

### Phase 4: Testing & Verification
- [ ] Verify all requirements met
- [ ] Document test results in progress.md
- [ ] Fix any issues found
- **Status:** in_progress

### Phase 5: Delivery
- [ ] Review all output files
- [ ] Ensure deliverables are complete
- [ ] Deliver to user
- **Status:** pending

## Key Questions
1. What is the most reliable way to allow selection while mouse reporting is enabled in tmux/xterm?
2. How should the behavior align with VSCode terminal conventions on macOS (modifier to force selection)?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Create OpenSpec change proposal before implementation | Required for breaking behavioral change per openspec/AGENTS.md |
| Use modifier-based selection override with tmux mouse enabled by default | Preserves TUI mouse interaction while allowing selection, aligned with tmux/xterm/VSCode conventions |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions
- Log ALL errors
