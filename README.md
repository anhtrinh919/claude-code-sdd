# claude-code-sdd

**Spec-Driven Development for Non-Devs.** Seven skills that make Claude Code ask before it acts, write the plan down, match the design you approved, and test its own work before saying done.

---

## What is this?

When a non-developer hands Claude Code a fuzzy idea, Claude tends to steamroll: it invents a plan in its head, writes code before anyone agreed on scope, drifts from the design, and declares success before anything's been tried end-to-end. You end up with a working-ish codebase you can't steer and can't debug.

`claude-code-sdd` installs seven skills that turn that steamroll into a gated pipeline. At every meaningful step, Claude stops, writes down what it intends to do, and asks you to approve before it touches the next thing. You stay the product owner; Claude stays the builder.

It is not an IDE, a framework, or a tutorial. It's a set of prompts that change how Claude Code behaves inside any project you're driving.

---

## Who it's for

- Solo operators, founders, product managers, designers — anyone steering AI coding without being the one writing the code.
- People who have tried Claude Code, liked what it could do, and hated what it sometimes did behind your back.
- Projects where correctness and intent matter more than shipping the first prototype in ten minutes.

**Not for:** teams with an existing SDLC, developers who want full manual control over every file, or one-off throwaway scripts.

---

## Why you'd use it — the four gates

The whole value is four checkpoints Claude cannot skip. Each prevents a specific way the steamroll shows up.

**1. Requirements gate.** Before any code, Claude writes `requirements.md` — the full contract for this phase: user stories, screens, API shapes, what's out of scope. You read it, approve it, or send it back. Prevents: Claude building something adjacent to what you wanted.

**2. Design gate.** The design file you approved (Pencil, Figma, etc.) is treated as the source of truth. Claude reads it frame by frame and builds from it — not from its own imagination or from whatever the existing codebase already looks like. Prevents: UI drift, surprise sidebars, "close enough" colors.

**3. Visual compliance gate.** Before every commit on a UI task, Claude screenshots the built page, opens the matching design frame, compares them side by side, and fixes the drift before saving the work. Prevents: "I'll get to that later" that never gets got to.

**4. Review gate.** After everything is built, a separate skill runs the full validation checklist against the spec, then dogfoods the app like a real user — clicking through every flow and reporting bugs, UX problems, and visual issues in plain language. Prevents: "tests pass, done" while the feature is unusable.

---

## The workflow in 60 seconds

```
/build                                      ← you type this
   └→ /ba         drills you on scope        ← you answer
   └→ /spec       writes the contract        ← you approve
   └→ /frontend   designs every screen       ← you approve
   └→ /backend    implements in groups       ← gated by code-harness
   └→ /review     spec + UX check            ← you read the report
   └→ you ship
```

Every arrow is a place Claude stops and shows you something before moving on. `/build` is re-entrant — if your session crashes, `/build` again and it picks up exactly where it was.

---

## Install

1. **Install Claude Code** — https://claude.com/claude-code

2. **Install this plugin**
   ```
   /plugin install github:anhtrinh919/claude-code-sdd
   ```

3. **(Optional) Install companions — recommended**
   - Per-agent memory, so skills learn across projects:
     ```
     /plugin install github:anhtrinh919/claude-sdd-wiki
     ```
   - Test-driven-development guard for logic-heavy phases:
     ```
     /plugin install github:nizos/tdd-guard
     ```
   - `bun` runtime (required by the verify harness): https://bun.sh
   - `browse` CLI (used by `/review` for UX dogfooding): see `docs/INSTALL-DEPS.md`
   - Pencil MCP (for design-driven UI phases): https://pencil.dev

`/build` checks these on first run and tells you which are missing with one-line install commands. Nothing blocks — missing companions just degrade gracefully.

---

## First project

In any directory (even empty):

```
cd ~/my-new-app
claude
/build
```

`/build` will detect this is a new project, hand off to `/ba`, and start drilling you on what you actually want to build and who it's for. Ten minutes later you'll have a constitution (mission, tech stack, roadmap). From there it's one phase at a time.

If you're joining an existing project that already has a `mission.md`, `/build` picks up at the next phase from the roadmap.

---

## The seven skills

| Skill | When it runs | What it produces |
|---|---|---|
| **`/build`** | You type it. | Detects where you are, routes to the right next skill, writes `.build-state.json` at every gate for crash recovery. |
| **`/ba`** | New project, phase kickoff, or between phases. | Drills you until scope, user stories, and screen inventory are real — not vague. |
| **`/spec`** | After `/ba`. | Writes `requirements.md`, `plan.md`, `validation.md` in a dated folder. You approve before anything else moves. |
| **`/frontend`** | After spec approval. | Writes a design brief, hands off to your design tool, extracts tokens and frame references into `handover.md`. |
| **`/backend`** | After frontend handover. | Reads the design file directly, implements in small groups, runs a visual compliance check before each commit. |
| **`/code-harness`** | Called by `/backend` on every task group. | Gates every change behind a spec-light contract, a failing test, and a verify script you can run. |
| **`/review`** | After backend completes. | Runs the full validation checklist, then clicks through the app like a user and reports bugs, UX issues, and visual drift. |

---

## FAQ

**Do I need to know how to code?** No. You need to know what you want and be able to read enough to say "yes that's what I meant" or "no that's wrong." Claude owns every technical decision that doesn't change what your users experience.

**What happens if I skip `/ba` and jump to coding?** Claude will happily build something. It just won't be the thing you meant. That's the whole problem this plugin solves.

**Can I use Figma instead of Pencil?** Yes. The design gate is tool-agnostic — it just needs a design file Claude can read. Pencil has the best MCP integration right now, but the skills work with any design source you can point Claude at.

**What does a "gate" actually do?** It's a point where Claude writes down what it's about to do and asks you to approve before proceeding. If you say no, it goes back one step. If you say yes, it moves forward and the state file is updated so a crashed session can resume from exactly that gate.

**How do I recover if `/build` gets confused?** Check `.build-state.json` in the project root — it tells you the last approved gate. Delete it to start the current phase over, or edit it to jump back a step.

**Does this work offline?** The skills themselves are local. Claude Code itself needs the Anthropic API. Design tool MCPs each have their own online/offline story.

---

## Troubleshooting

- **`/build` keeps re-asking questions you already answered.** Your `.build-state.json` was reset or deleted — check the file exists and has the `step` you expected.
- **Wiki integration errors in logs.** `claude-sdd-wiki` isn't installed. The skills are designed to degrade silently — these log lines are informational, not blocking.
- **Hook conflicts with another plugin.** Claude Code runs all plugin hooks; if two plugins register the same trigger, they both fire. Disable the conflicting plugin in Claude Code settings.
- **`/review` says "no validation spec found."** You're invoking it outside a phase directory. Run `/spec` for this phase first.

---

## Contributing & license

MIT. Issues and PRs at https://github.com/anhtrinh919/claude-code-sdd.

Built alongside [`claude-sdd-wiki`](https://github.com/anhtrinh919/claude-sdd-wiki) — the two plugins are independent but work better together.
