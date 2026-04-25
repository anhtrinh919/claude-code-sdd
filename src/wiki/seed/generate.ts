import type { WikiEntry } from "../schema/entry";

export const WIKI_GENERATED_MARKER = "<!-- wiki-generated -->";

export function generateWikiMd(
  entries: WikiEntry[],
  detectedTags: string[],
  projectName: string
): string {
  const date = new Date().toISOString().slice(0, 10);
  const tagLine = detectedTags.join(", ") || "general";

  const grouped = new Map<string, WikiEntry[]>();
  for (const entry of entries) {
    const primaryTag = entry.tags[0] ?? "general";
    const group = grouped.get(primaryTag) ?? [];
    group.push(entry);
    grouped.set(primaryTag, group);
  }

  const sections: string[] = [];
  for (const [tag, groupEntries] of grouped) {
    const header = `## ${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
    const items = groupEntries
      .map((e) => `### ${e.title}\n${e.body}`)
      .join("\n\n");
    sections.push(`${header}\n\n${items}`);
  }

  return [
    WIKI_GENERATED_MARKER,
    `# Project WIKI — ${projectName}`,
    `*Seeded from global wiki on ${date}. Relevant to: ${tagLine}. ${entries.length} entries.*`,
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");
}
