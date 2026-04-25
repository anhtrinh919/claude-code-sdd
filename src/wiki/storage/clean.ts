import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { listEntries } from "./write";
import { entryPath, WIKI_DIR } from "./paths";
import type { WikiEntry } from "../schema/entry";

const STALE_DAYS = 180;

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function tagOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}

export function isStale(entry: WikiEntry, allEntries: WikiEntry[]): boolean {
  if (daysSince(entry.updated) < STALE_DAYS) return false;

  const hasNewerSibling = allEntries.some(
    (other) =>
      other.title !== entry.title &&
      daysSince(other.updated) < STALE_DAYS &&
      tagOverlap(other.tags, entry.tags) >= 2
  );

  return hasNewerSibling;
}

export function archiveStale(wikiDir: string = WIKI_DIR): number {
  const entries = listEntries(wikiDir);
  const archivedDir = join(wikiDir, "entries", "archived");
  mkdirSync(archivedDir, { recursive: true });

  let count = 0;
  for (const entry of entries) {
    if (isStale(entry, entries)) {
      const src = entryPath(entry.title, entry.created, wikiDir);
      const dest = join(archivedDir, src.split("/").at(-1)!);
      renameSync(src, dest);
      count++;
    }
  }
  return count;
}
