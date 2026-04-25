# Phase [N] Spec — [Feature Name]

## Scope
[One paragraph: what this phase delivers, why it comes at this point in the roadmap, and what a user can do when it's complete that they couldn't do before.]

## User Stories
- As a [actor], I can [specific action] so that [specific outcome].
- As a [actor], I can [specific action] so that [specific outcome].

[Minimum one story per major user action. "Manage content" is not a story — name the exact action.]

## Screen Inventory
Every screen in this phase. Every unique state = its own row.

| Screen | State | Key UI Elements | Primary User Action |
|--------|-------|-----------------|---------------------|
| [Name] | Default | [List main elements] | [What user does here] |
| [Name] | Empty | [Empty state + action prompt] | |
| [Name] | Loading | [Skeleton or spinner] | |
| [Name] | Error | [Error message + recovery path] | |
| [Name] | Mobile | [How layout adapts — not just "stacked"] | |

## Functional Requirements
Specific and testable. "User can X" not "system handles X."

- [ ] [Requirement — specific, observable]
- [ ] Edge case: [what happens when X]
- [ ] Error condition: [what happens when Y fails]
- [ ] Empty state: [what user sees with no data]

## Non-Functional Requirements
- **Performance:** [Specific — e.g. "list loads under 2s on a 10k-row dataset"]
- **Security:** [Specific — e.g. "input sanitized before DB write; auth required on all /api/ routes"]
- **Accessibility:** [Specific — e.g. "keyboard navigable; WCAG AA contrast; form inputs have labels"]

## API Contracts
One section per endpoint. Frontend and backend both build against this — it is the shared contract.

### [Endpoint Name]
- **Method + path:** `[GET/POST/PUT/DELETE] /api/[path]`
- **Auth required:** Yes / No
- **Request body:** `{ field: type }` (POST/PUT only)
- **Query params:** `?field=type` (GET only)
- **Success response:** `{ field: type }` — status [200/201]
- **Error responses:**
  - `400`: [condition that triggers this] — `{ error: "message" }`
  - `401`: Unauthenticated
  - `404`: [resource not found condition]
  - `500`: Unexpected server error

## Acceptance Criteria
Binary pass/fail. No judgment required — each criterion is a specific observable outcome.

- [ ] User does [action] → sees [specific result]
- [ ] User submits invalid input → sees [specific error message]
- [ ] Empty state: user with no data → sees [message] with [action button]
- [ ] Error state: [upstream failure] → user sees [specific message], not a blank screen
- [ ] Mobile: user on 390px screen can complete [core action] without horizontal scroll
- [ ] API: [METHOD] [endpoint] with valid input returns [status] with correct shape
- [ ] API: [METHOD] [endpoint] with missing required field returns 400

## Out of Scope
Explicitly named. Anything not listed above is excluded from this phase.

- [Feature or behavior explicitly excluded]
- [Another explicit exclusion]

## Definition of Done
This phase is complete when ALL of the following are true:

- [ ] All acceptance criteria pass
- [ ] All API contracts verified: correct response shape, correct error responses, edge cases
- [ ] Frontend spec compliance check passes
- [ ] Backend spec compliance check passes
- [ ] UX review passes with no blocking issues
- [ ] user explicitly approves
- [ ] Living docs updated: README status, WIKI learnings, docs/api.md, docs/decisions.md
