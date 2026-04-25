import type { WikiEntry } from "../schema/entry";

const MAX_ENTRIES = 30;

export function filterAndRank(entries: WikiEntry[], tags: string[]): WikiEntry[] {
  if (tags.length === 0) return [];

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  return entries
    .filter((e) => e.tags.some((t) => tagSet.has(t.toLowerCase())))
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, MAX_ENTRIES);
}
