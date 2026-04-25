# [Feature Name] Validation

This is the test contract for `/review`. Every check listed here must pass before the phase is approved.

## Automated Checks

Run these commands. Each must exit 0.

- **TypeScript:** `tsc --noEmit` — zero errors
- **Unit tests:** `[test command]` — verifies [what specifically]
- **API — [endpoint]:** `curl -sf [method] http://localhost:[port]/api/[path]` — returns [status] with `{ field: value }`
- **API — [endpoint]:** error case — `[request with bad input]` returns 400

## Manual Verification

Walk through these checks in a browser. Each is pass/fail.

**Viewport 390px (mobile):**
- [ ] [Specific screen] — [what to check and what correct looks like]
- [ ] [Core user action] completes without horizontal scroll

**Viewport 1280px (desktop):**
- [ ] [Specific screen] — [what to check]
- [ ] Navigation between [page] and [page] works

**User flows:**
- [ ] [Step 1 → Step 2 → Step 3]: user sees [expected result]
- [ ] Empty state: navigate to [screen] with no data → user sees [message] with [action]
- [ ] Error state: [trigger condition] → user sees [specific message], not blank screen
- [ ] [Edge case]: [what to do] → [expected behavior]

## Definition of Done

This phase is complete when ALL of the following are true:

- [ ] All automated checks pass (exit 0)
- [ ] All manual verifications pass
- [ ] Frontend compliance check passes (handover covers all UI requirements)
- [ ] UX review passes — no blocking issues
- [ ] user explicitly approves
- [ ] Living docs updated: README status, WIKI learnings, docs/api.md, CHANGELOG.md
