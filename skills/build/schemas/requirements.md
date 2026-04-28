# [Feature Name] Requirements

---
phase: [N]
type: initial | feature | rebuild
tdd_guard: on | off
ui: true | false
---

## Phase type

- **`initial`** — first build of a new product area. No existing UI patterns to honor. Greenfield behavior.
- **`feature`** — adds new capability to an existing product. Follow existing codebase patterns and chrome; only invent what the new capability requires.
- **`rebuild`** — visual or structural redesign of existing product. **Existing UI patterns are explicitly overridden** by the design file. Backend must mirror the design tree, not the existing codebase. TDD-guard typically `off` (pure UI, no new logic).

## TDD guard

- **`on`** — every group writes a failing test before implementation. Use for logic-heavy phases (`initial`, `feature` with new backend).
- **`off`** — pure UI / pure refactor / pure visual rebuild. No logic to test.

## UI flag

- **`ui: true`** (default — assume true if missing) — phase produces visible UI. `/review` Step 1.5 visual compliance runs.
- **`ui: false`** — pure backend / infra / tooling phase, no rendered screens. `/review` Step 1.5 is skipped explicitly. Do not infer from screen count — set the flag.

## Scope
[What this phase delivers. What a user can do on completion that they couldn't before. One paragraph.]

## User Stories
- As a [actor], I can [specific action] so that [specific outcome].
- As a [actor], I can [specific action] so that [specific outcome].

[One story per major user action. "Manage content" is not a story — name the exact action.]

## UI Requirements
Every screen in this phase. Every unique state = its own row.

| Screen | State | Key UI Elements | Primary User Action |
|--------|-------|-----------------|---------------------|
| [Name] | Default | [Main elements] | [What user does] |
| [Name] | Empty | [Empty state + action prompt] | |
| [Name] | Loading | [Skeleton or spinner] | |
| [Name] | Error | [Error message + recovery] | |
| [Name] | Mobile | [Intentional layout adaptation] | |

## Data Model
[Tables or schemas with field names and types. Include relationships.]

```
[Table / Schema name]
- field_name: type — description
- field_name: type — description
```

## API Contracts
One section per endpoint. Frontend and backend both build against these exactly.

### [Endpoint Name]
- **Method + path:** `[GET/POST/PUT/DELETE] /api/[path]`
- **Auth required:** Yes / No
- **Request body:** `{ field: type }` (POST/PUT only)
- **Query params:** `?field=type` (GET only)
- **Success response:** `{ field: type }` — status [200/201]
- **Error responses:**
  - `400`: [specific condition] — `{ error: "message" }`
  - `401`: Unauthenticated
  - `404`: [resource not found condition]
  - `500`: Unexpected server error

## Constraints & Context
[Business rules, tone, patterns to follow from tech-stack.md, non-negotiables for this phase.]

- [Constraint]
- [Pattern to follow from existing codebase]

## Excluded from This Phase
Explicitly named. Anything not listed above is out of scope.

- [Feature or behavior explicitly excluded]
- [Another explicit exclusion]
