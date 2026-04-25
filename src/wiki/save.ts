import { AGENT_VALUES, TRIGGER_VALUES, WikiEntrySchema } from "./schema/entry";
import type { Agent, Trigger, WikiEntry } from "./schema/entry";
import { findSimilar } from "./storage/dedup";
import { writeEntry, atomicWriteEntry } from "./storage/write";
import { entryPath, WIKI_DIR } from "./storage/paths";
import { archiveStale } from "./storage/clean";
import { commitAll } from "./git";

type SaveInput = {
  title: string;
  tags: string[];
  source: string;
  body: string;
  agent?: Agent;
  trigger?: Trigger;
  phase?: number;
};

type SaveResult = {
  status: "saved" | "updated";
  title: string;
  archivedCount: number;
};

export function saveEntry(input: SaveInput, wikiDir: string = WIKI_DIR): SaveResult {
  const today = new Date().toISOString().slice(0, 10);

  const parsed = WikiEntrySchema.safeParse({
    title: input.title,
    tags: input.tags,
    created: today,
    updated: today,
    source: input.source,
    body: input.body,
    agent: input.agent,
    trigger: input.trigger,
    phase: input.phase,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Validation failed: ${issues}`);
  }

  const entry = parsed.data;
  const existing = findSimilar(entry.title, entry.tags, wikiDir);
  let status: "saved" | "updated";

  if (existing) {
    const existingBodyNorm = existing.body.trim();
    const newBodyNorm = entry.body.trim();
    const mergedBody =
      existingBodyNorm === newBodyNorm
        ? existingBodyNorm
        : `${existingBodyNorm}\n\n---\n\n${newBodyNorm}`;

    const updated: WikiEntry = {
      ...existing,
      tags: [...new Set([...existing.tags, ...entry.tags])],
      body: mergedBody,
      updated: today,
      agent: entry.agent,
      trigger: entry.trigger,
      phase: entry.phase ?? existing.phase,
    };
    const filepath = entryPath(existing.title, existing.created, wikiDir);
    atomicWriteEntry(filepath, updated);
    status = "updated";
  } else {
    writeEntry(entry, wikiDir);
    status = "saved";
  }

  const archivedCount = archiveStale(wikiDir);
  return { status, title: entry.title, archivedCount };
}

export async function runSave(args: string[]): Promise<number> {
  const isAuto = args.includes("--auto");

  function getArg(name: string): string | null {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || !args[idx + 1]) {
      if (!isAuto) console.error(`Missing required argument: --${name}`);
      return null;
    }
    return args[idx + 1]!;
  }

  function getOptionalArg(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || !args[idx + 1]) return undefined;
    return args[idx + 1];
  }

  const title = getArg("title");
  const tagsRaw = getArg("tags");
  const source = getArg("source");
  const body = getArg("body");
  if (title === null || tagsRaw === null || source === null || body === null) return 1;

  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);

  const agentRaw = getOptionalArg("agent");
  const triggerRaw = getOptionalArg("trigger");
  const phaseRaw = getOptionalArg("phase");

  let agent: Agent | undefined;
  if (agentRaw !== undefined) {
    if (!(AGENT_VALUES as readonly string[]).includes(agentRaw)) {
      if (!isAuto) console.error(`Validation failed: agent: invalid enum value '${agentRaw}'`);
      return 1;
    }
    agent = agentRaw as Agent;
  }

  let trigger: Trigger | undefined;
  if (triggerRaw !== undefined) {
    if (!(TRIGGER_VALUES as readonly string[]).includes(triggerRaw)) {
      if (!isAuto) console.error(`Validation failed: trigger: invalid enum value '${triggerRaw}'`);
      return 1;
    }
    trigger = triggerRaw as Trigger;
  }

  let phase: number | undefined;
  if (phaseRaw !== undefined) {
    const n = Number(phaseRaw);
    if (!Number.isInteger(n)) {
      if (!isAuto) console.error(`Validation failed: phase: expected integer, got '${phaseRaw}'`);
      return 1;
    }
    phase = n;
  }

  try {
    const result = saveEntry({ title, tags, source, body, agent, trigger, phase });

    if (!isAuto) {
      const verb = result.status === "saved" ? "Saved" : "Updated";
      console.log(`${verb}: ${result.title}`);
      if (result.archivedCount > 0) {
        console.log(`Archived ${result.archivedCount} stale entries.`);
      }
    }

    await commitAll(`wiki: ${result.status} "${title}"`).catch((e) => {
      console.error(`Git commit failed: ${e instanceof Error ? e.message : String(e)}`);
    });
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!isAuto) console.error(msg);
    return 1;
  }
}

if (import.meta.main) {
  process.exit(await runSave(process.argv.slice(2)));
}
