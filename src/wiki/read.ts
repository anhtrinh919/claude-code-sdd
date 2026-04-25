import { existsSync } from "node:fs";
import { AGENT_VALUES } from "./schema/entry";
import type { Agent } from "./schema/entry";
import { readEntries, formatEntries } from "./storage/read";
import { WIKI_DIR } from "./storage/paths";

export { readEntries, formatEntries };

export function runRead(args: string[]): number {
  function getArg(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || !args[idx + 1]) return undefined;
    return args[idx + 1];
  }

  const agentRaw = getArg("agent");
  if (agentRaw === undefined) {
    console.error("Missing required argument: --agent");
    return 1;
  }
  if (!(AGENT_VALUES as readonly string[]).includes(agentRaw)) {
    console.error(`Invalid agent: ${agentRaw}`);
    return 1;
  }
  const agent = agentRaw as Agent;

  const tagsRaw = getArg("tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const limitRaw = getArg("limit");
  let limit = 10;
  if (limitRaw !== undefined) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      console.error("Invalid limit: must be 1–50");
      return 1;
    }
    limit = n;
  }

  if (!existsSync(WIKI_DIR)) {
    console.error(`Wiki directory not found: ${WIKI_DIR}`);
    return 1;
  }

  const results = readEntries({ agent, tags, limit });
  process.stdout.write(formatEntries(results));
  return 0;
}

if (import.meta.main) {
  process.exit(runRead(process.argv.slice(2)));
}
