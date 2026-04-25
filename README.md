# claude-code-sdd

**Spec-Driven Development for non-developers.** A Claude Code plugin that force you and Claude to think and act like a real development team — at every stage.

---

## The problem

If you're not a developer, Claude Code has a bad habit: you give it a fuzzy idea, it invents a plan in its head, writes whatever it wants, and tells you it's done. You look at it, it's wrong, and you can't explain exactly why or how to fix it.

This happens because there are no checkpoints. Nothing forces Claude to show you the plan before executing it, match the design you actually approved, or verify the thing works before calling it shipped.

`claude-code-sdd` fixes that with four hard gates.

---

## What it does

This plugin enforces **Spec-Driven Development (SDD)** — a practice where every phase starts with a written spec you approve, and ends with a validation pass against that spec before anything moves forward.

Four phases. Four gates. Claude cannot skip any of them.

**1. Specify**
Before writing a single line of code, Claude writes `requirements.md` — the full contract for this phase. User stories, what's in scope, what's out, how the pieces connect. You read it and either approve it or send it back. Nothing happens until you say yes.

**2. Design**
Your design file (Pencil or Figma) is the source of truth — not Claude's imagination, not what the existing codebase already looks like. Claude reads your file frame by frame and builds from it directly. This is what stops the "surprise sidebar" and the "close enough" colors.

**3. Build + Visual Compliance**
As Claude builds each UI piece, it screenshots what it made, puts it side by side with your design frame, and fixes anything that drifted before it saves the work. Not after. Before.

**4. Review**
After everything's built, a separate review skill runs through the app like a real user — clicking through every flow, checking the spec line by line, and writing up what works, what's broken, and what looks off. In plain English you can actually act on.

---

## Who this is for

Non-developers who want to vibe-code larger projects — founders, PMs, designers building real products with Claude Code but not writing the code themselves.

The bigger your project, the more Claude drifts without structure. If you're past the "quick prototype" phase and things keep breaking in ways you can't debug, this is for you.

**Not for:** teams with an existing dev process, developers who want full control over every file, or one-off throwaway scripts.

---

## Known limitations

**Don't try this on Claude Pro.** Each gate burns a lot of context. You will hit rate limits mid-build and the flow will stall. Max plan minimum.

**This is v0.1.0.** Gates will break. Flows will get stuck. When they do, file an issue and I'll fix it fast.

---

## Recommended design tool: [pencil.dev](https://pencil.dev)

Free Claude Code wrapper built for design. If you don't have a design tool set up yet, start here. The design gate works best when Claude can read a real Pencil file via MCP — it reads your frames directly, which is more reliable than exporting images.

Figma works too. The gate is tool-agnostic.

---

## Install

**Step 1 — Install Claude Code**
https://claude.com/claude-code

**Step 2 — Install this plugin**
```
/plugin install github:anhtrinh919/claude-code-sdd
```

**Step 3 — Optional but recommended**

Memory across sessions (skills remember your project):
```
/plugin install github:anhtrinh919/claude-sdd-wiki
```

TDD guard for logic-heavy phases:
```
/plugin install github:nizos/tdd-guard
```

`/build` will check for missing companions on first run and give you the install command for anything that's missing. Nothing is blocking — missing pieces degrade gracefully.

---

## Starting your first project

In any folder (even empty):

```
cd ~/my-new-app
claude
/build
```

`/build` detects it's a new project and hands off to `/ba`, which drills you on what you're building and who it's for. Ten minutes later you'll have a constitution: mission, tech stack, roadmap. From there it's one phase at a time.

If you're picking up an existing project that already has a `mission.md`, `/build` reads where you left off and continues from the next gate.

---

## How the workflow runs

```
/build
  → /ba        drills you on scope and user stories
  → /spec      writes the contract (requirements + plan + validation)
  → you approve
  → /frontend  design brief + handover doc
  → you approve
  → /backend   builds from the design, visual compliance on every UI commit
  → /review    spec check + UX dogfood + written report
  → you ship
```

Every arrow is a place Claude stops and shows you what it's about to do. `/build` is crash-safe — if your session dies mid-phase, run `/build` again and it picks up at the last approved gate.

---

## The seven skills

| Skill | What it does |
|---|---|
| `/build` | Entry point. Reads state, routes to the right next skill, writes `.build-state.json` at every gate. |
| `/ba` | Drills you on scope until user stories and screen inventory are concrete, not vague. |
| `/spec` | Writes `requirements.md`, `plan.md`, `validation.md`. Nothing moves until you approve all three. |
| `/frontend` | Writes the design brief, hands off to your design tool, extracts tokens and frame references into `handover.md`. |
| `/backend` | Reads the design file directly, implements in small task groups, visual compliance check before each commit. |
| `/code-harness` | Called by `/backend` on every task group. Gates each change behind a spec contract and a verify script. |
| `/review` | Runs the validation checklist, then clicks through the app like a user. Reports bugs, UX problems, visual drift. |

---

## FAQ

**Do I need to know how to code?**
No. You need to know what you want and be able to read enough to say "yes, that's what I meant" or "no, that's wrong." Claude owns every technical decision that doesn't affect what your users experience.

**What happens if I just tell Claude to start coding without running `/build`?**
Claude will build something. It just won't be the thing you meant. That's the problem this plugin solves.

**Can I use Figma instead of Pencil?**
Yes. The design gate is tool-agnostic — it needs a design file Claude can read. Pencil has the tightest MCP integration right now, but any design source you can point Claude at will work.

**What actually happens at a gate?**
Claude writes down what it's about to do and asks you to approve. If you say no, it goes back one step and revises. If you say yes, the state file is updated and the session can recover from exactly that point if it crashes.

**How do I recover if `/build` gets confused?**
Check `.build-state.json` in the project root — it shows the last approved gate. Delete it to restart the current phase, or edit the `step` field to jump back one gate.

---

## Troubleshooting

**`/build` keeps re-asking things you already answered.**
Your `.build-state.json` was reset or deleted. Check that the file exists and has the `step` you expect.

**Wiki errors in the logs.**
`claude-sdd-wiki` isn't installed. These are informational — nothing is blocked.

**`/review` says "no validation spec found."**
You're running it outside a phase directory. Run `/spec` for this phase first.

**Hook conflicts with another plugin.**
Claude Code fires all hooks from all plugins. If two plugins register the same trigger, both fire. Disable the conflicting plugin in Claude Code settings.

---

## Contributing

MIT. Issues and PRs at https://github.com/anhtrinh919/claude-code-sdd

Companion plugin (memory across sessions): https://github.com/anhtrinh919/claude-sdd-wiki
