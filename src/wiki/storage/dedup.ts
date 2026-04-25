import { listEntries } from "./write";
import { WIKI_DIR } from "./paths";
import type { WikiEntry } from "../schema/entry";

function titlePrefix(title: string): string {
  return title.toLowerCase().split(" ").slice(0, 3).join(" ");
}

function tagOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}

export function findSimilar(
  title: string,
  tags: string[],
  wikiDir: string = WIKI_DIR
): WikiEntry | null {
  const entries = listEntries(wikiDir);

  const exactTitle = entries.find(
    (e) => e.title.toLowerCase() === title.toLowerCase()
  );
  if (exactTitle) return exactTitle;

  const prefix = titlePrefix(title);
  const byTagsAndPrefix = entries.find(
    (e) => tagOverlap(e.tags, tags) >= 2 && titlePrefix(e.title) === prefix
  );
  return byTagsAndPrefix ?? null;
}
