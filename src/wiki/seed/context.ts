import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const KNOWN_TECH_TERMS = new Set([
  "typescript", "javascript", "python", "go", "rust", "java", "ruby", "swift",
  "bun", "node", "deno", "react", "vue", "svelte", "next", "nuxt", "remix",
  "hono", "express", "fastify", "postgres", "sqlite", "mysql", "redis",
  "docker", "kubernetes", "git", "github", "vercel", "railway", "supabase",
  "zod", "prisma", "drizzle", "tailwind", "vite", "webpack", "esbuild",
]);

export function readMissionContext(projectDir: string): string[] {
  const missionPath = join(projectDir, "mission.md");
  if (!existsSync(missionPath)) return [];

  const content = readFileSync(missionPath, "utf8").toLowerCase();
  const words = content.match(/\b[a-z][a-z0-9.-]+\b/g) ?? [];
  return words.filter((w) => KNOWN_TECH_TERMS.has(w));
}
