import matter from "gray-matter";
import { WikiEntrySchema } from "../schema/entry";
import type { WikiEntry } from "../schema/entry";

export class ParseError extends Error {
  constructor(filepath: string, reason: string) {
    super(`ParseError in ${filepath}: ${reason}`);
    this.name = "ParseError";
  }
}

export function parseEntry(content: string, filepath: string): WikiEntry {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (e) {
    throw new ParseError(filepath, `invalid frontmatter: ${String(e)}`);
  }

  const result = WikiEntrySchema.safeParse({
    ...parsed.data,
    body: parsed.content.trim(),
  });

  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join(", ");
    throw new ParseError(filepath, issues);
  }

  return result.data;
}

export function serializeEntry(entry: WikiEntry): string {
  const { body, ...frontmatter } = entry;
  const cleaned = Object.fromEntries(
    Object.entries(frontmatter).filter(([, v]) => v !== undefined)
  );
  return matter.stringify(`\n${body}`, cleaned);
}
