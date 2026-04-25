import { mkdirSync, renameSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entryPath, WIKI_DIR } from "./paths";
import { parseEntry, serializeEntry } from "./parse";
import type { WikiEntry } from "../schema/entry";

export function atomicWriteEntry(filepath: string, entry: WikiEntry): void {
  const tmpPath = filepath + ".tmp";
  const content = serializeEntry(entry);
  writeFileSync(tmpPath, content, "utf8");
  parseEntry(content, tmpPath);
  renameSync(tmpPath, filepath);
}

export function writeEntry(entry: WikiEntry, wikiDir: string = WIKI_DIR): string {
  const entriesDir = join(wikiDir, "entries");
  mkdirSync(entriesDir, { recursive: true });

  const finalPath = entryPath(entry.title, entry.created, wikiDir);
  atomicWriteEntry(finalPath, entry);
  return finalPath;
}

export function readEntry(filepath: string): WikiEntry {
  const content = readFileSync(filepath, "utf8");
  return parseEntry(content, filepath);
}

export function listEntries(wikiDir: string = WIKI_DIR): WikiEntry[] {
  const entriesDir = join(wikiDir, "entries");
  const archivedDir = join(entriesDir, "archived");

  let files: string[];
  try {
    files = readdirSync(entriesDir) as string[];
  } catch {
    return [];
  }

  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(entriesDir, f))
    .filter((p) => !p.startsWith(archivedDir))
    .flatMap((p) => {
      try {
        return [readEntry(p)];
      } catch {
        return [];
      }
    });
}
