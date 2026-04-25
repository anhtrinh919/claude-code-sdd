import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { detectTechStack } from "./detect";
import { readMissionContext } from "./context";
import { filterAndRank } from "./filter";
import { generateWikiMd, WIKI_GENERATED_MARKER } from "./generate";
import { listEntries } from "../storage/write";
import { WIKI_DIR } from "../storage/paths";

export function runSeed(projectDir: string, wikiDir: string = WIKI_DIR): void {
  if (!existsSync(wikiDir)) return;

  const stackTags = detectTechStack(projectDir);
  const contextTags = readMissionContext(projectDir);
  const allTags = [...new Set([...stackTags, ...contextTags])];

  if (allTags.length === 0) return;

  const entries = listEntries(wikiDir);
  const relevant = filterAndRank(entries, allTags);

  if (relevant.length === 0) return;

  const wikiPath = join(projectDir, "WIKI.md");
  if (existsSync(wikiPath)) {
    const existing = readFileSync(wikiPath, "utf8");
    if (!existing.startsWith(WIKI_GENERATED_MARKER)) return;
  }

  const projectName = basename(projectDir);
  const content = generateWikiMd(relevant, allTags, projectName);
  writeFileSync(wikiPath, content, "utf8");
}

if (import.meta.main) {
  const projectDir = process.argv[2] ?? process.cwd();
  try {
    runSeed(projectDir);
    process.exit(0);
  } catch (e) {
    console.error(`Seed failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(0);
  }
}
