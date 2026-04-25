#!/usr/bin/env bun
import { runRead } from "./read";
import { runSave } from "./save";
import { initWiki } from "./setup/init";
import { runSeed } from "./seed/seed";

const HELP = `Wiki CLI — per-agent scratchpad memory for Claude Code skills (bundled inside claude-code-sdd).

Subcommands:
  read    --agent <name> [--tags a,b,c] [--limit N]
  save    --title "..." --tags a,b --source <project> --body "..."
          [--agent <name>] [--trigger <kind>] [--phase N] [--auto]
  init    [remoteUrl]       Initialize ~/.claude/wiki as a git repo
  seed    [projectDir]      Write WIKI.md into a project from past entries
  help                      Show this help

Env:
  CLAUDE_WIKI_HOME   Override the wiki directory (default: ~/.claude/wiki)
  WIKI_DIR_OVERRIDE  Legacy alias for CLAUDE_WIKI_HOME
  WIKI_REMOTE        Git remote for \`init\` (optional)
`;

async function main(): Promise<number> {
  const [subcommand, ...rest] = process.argv.slice(2);

  switch (subcommand) {
    case "read":
      return runRead(rest);
    case "save":
      return await runSave(rest);
    case "init":
      try {
        const remote = rest[0];
        await initWiki(undefined, remote);
        console.log("Wiki initialized.");
        return 0;
      } catch (e) {
        console.error(`init failed: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
      }
    case "seed":
      try {
        runSeed(rest[0] ?? process.cwd());
        return 0;
      } catch (e) {
        console.error(`seed failed: ${e instanceof Error ? e.message : String(e)}`);
        return 0;
      }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      process.stdout.write(HELP);
      return subcommand === undefined ? 1 : 0;
    default:
      console.error(`Unknown subcommand: ${subcommand}\n`);
      process.stderr.write(HELP);
      return 1;
  }
}

process.exit(await main());
