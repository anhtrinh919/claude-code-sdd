# Design Brief — Claude Code Path

Full-detail brief used when Claude Code designs the UI directly via HTML/CSS/React static mockups. Every section must be filled — this is the implementation contract for the mockup phase.

---

## Visual style

Pick a specific direction that fits the product's mission and tone (from `mission.md`). State **why** — specific reasoning tied to who uses this and what it needs to feel like.

## Layout hierarchy per screen

For each screen in `requirements.md`'s UI Requirements table, state what the user sees first, second, third. Name the primary element explicitly. Do this for every screen — not just the main one.

## Component decisions

Name the specific component for each major UI element. Not "a button" — "a destructive-action button with inline confirmation." Not "a list" — "a paginated table with inline row actions, sortable by column."

## Interaction patterns

For each primary user action in `requirements.md`, name the pattern: optimistic update, confirmation gate, inline edit, modal, toast feedback, full-page redirect, etc.

## Mobile strategy

State the specific layout adaptation for each screen if mobile is in scope. If desktop only, state that explicitly.

## Empty and error states

For each screen with an empty state: name the warmth element + primary CTA. For each error state: name the exact message and recovery path.

## Screen checklist

At the end of the brief, list every screen + state from `requirements.md`'s UI Requirements table as a numbered checklist. This checklist is the coverage contract for the mockup phase.
