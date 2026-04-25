import { homedir } from "node:os";
import { join } from "node:path";
import { toSlug } from "../schema/slug";

export function getWikiDir(): string {
  return (
    process.env["CLAUDE_WIKI_HOME"] ??
    process.env["WIKI_DIR_OVERRIDE"] ??
    join(homedir(), ".claude", "wiki")
  );
}

export const WIKI_DIR = getWikiDir();
export const ENTRIES_DIR = join(WIKI_DIR, "entries");
export const ARCHIVED_DIR = join(ENTRIES_DIR, "archived");

export function entryPath(title: string, date: string, wikiDir: string = WIKI_DIR): string {
  const slug = toSlug(title);
  return join(wikiDir, "entries", `${date}-${slug}.md`);
}
