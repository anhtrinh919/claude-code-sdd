# Quickstart

From zero to your first approved phase in ~15 minutes.

## 1. Install

- Install Claude Code: https://claude.com/claude-code
- Install this plugin inside Claude Code:
  ```
  /plugin install github:anhtrinh919/claude-code-sdd
  ```
- (Recommended) Install companions:
  ```
  /plugin install github:anhtrinh919/claude-sdd-wiki
  /plugin install github:nizos/tdd-guard
  ```
- Install `bun` (required by the verify harness): https://bun.sh

## 2. Start a project

```
mkdir ~/my-app && cd ~/my-app
claude
```

Inside the Claude Code session:

```
/build
```

## 3. What happens next

`/build` sees an empty directory, calls `/preflight` once to check your dependencies, then hands off to `/ba`. `/ba` will drill you on:

- What you're building (outcome, not features)
- Who it's for (name the actual person)
- What it does NOT do (scope rails)
- The rough roadmap (phase order)

Then `/spec` writes `mission.md`, `tech-stack.md`, and `roadmap.md`. You approve them. `/build` stops and waits for you to re-invoke it for Phase 1.

## 4. Phase 1

```
/build
```

This kicks off the feature loop: `/ba` → `/spec` → you approve → `/frontend` → you design → you approve → `/backend` → `/review` → you approve. Each gate is a place Claude stops and asks. Phase 1 is usually done in one sitting.

## 5. When something goes wrong

- `.build-state.json` in the project root tells you exactly which gate you're at.
- Delete the file to restart the current phase.
- Edit the `step` field to jump back a step.
- If you want to re-check your setup: `/preflight`.
