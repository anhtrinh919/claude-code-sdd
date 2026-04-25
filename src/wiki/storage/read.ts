import { listEntries } from "./write";
import { WIKI_DIR } from "./paths";
import type { Agent, WikiEntry } from "../schema/entry";

export type RankedEntry = WikiEntry & { score: number };

export type ReadQuery = {
  agent: Agent;
  tags?: string[];
  limit?: number;
  wikiDir?: string;
};

export function readEntries(query: ReadQuery): RankedEntry[] {
  const tags = query.tags ?? [];
  const limit = query.limit ?? 10;
  const wikiDir = query.wikiDir ?? WIKI_DIR;
  const entries = listEntries(wikiDir);
  const tagSet = new Set(tags);

  const ranked: RankedEntry[] = entries
    .map((entry) => {
      const agentMatch = entry.agent === query.agent ? 1 : 0;
      const tagOverlap = entry.tags.filter((t) => tagSet.has(t)).length;
      const score = agentMatch * 2 + tagOverlap;
      return { ...entry, score };
    })
    .filter((entry) => entry.score >= 1);

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.updated.localeCompare(a.updated);
  });

  return ranked.slice(0, limit);
}

export function formatEntries(entries: RankedEntry[]): string {
  if (entries.length === 0) return "# No relevant entries\n";

  const header = `# ${entries.length} relevant ${entries.length === 1 ? "entry" : "entries"}\n`;
  const sections = entries.map((e) => formatOne(e)).join("\n---\n\n");
  return `${header}\n${sections}`;
}

function formatOne(entry: RankedEntry): string {
  const phasePart = entry.phase !== undefined ? `, phase ${entry.phase}` : "";
  const heading = `## ${entry.title} — ${entry.agent}, ${entry.trigger}${phasePart}\n`;
  const tagsLine = `tags: ${entry.tags.join(", ")}\n`;
  const createdLine = `created: ${entry.created}\n`;
  return `${heading}${tagsLine}${createdLine}\n${entry.body}\n`;
}
