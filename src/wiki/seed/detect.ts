import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

function fromTechStackMd(projectDir: string): string[] {
  const techStackPath = join(projectDir, "tech-stack.md");
  if (!existsSync(techStackPath)) return [];

  const content = readFileSync(techStackPath, "utf8");
  const choicesMatch = content.match(/##\s+Choices([\s\S]*?)(?=##|$)/);
  if (!choicesMatch) return [];

  const choicesBlock = choicesMatch[1] ?? "";
  const valuePattern = /:\*{0,2}\s+([A-Za-z][A-Za-z0-9._-]*)/g;
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = valuePattern.exec(choicesBlock)) !== null) {
    const val = m[1]?.toLowerCase();
    if (val && val !== "none" && val !== "yes" && val !== "no") {
      tags.push(val);
    }
  }
  return tags;
}

function fromPackageJson(projectDir: string): string[] {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    const deps = {
      ...(pkg["dependencies"] as Record<string, string> | undefined ?? {}),
      ...(pkg["devDependencies"] as Record<string, string> | undefined ?? {}),
    };
    return Object.keys(deps).map((d) => d.toLowerCase());
  } catch {
    return [];
  }
}

export function detectTechStack(projectDir: string): string[] {
  const fromStack = fromTechStackMd(projectDir);
  if (fromStack.length > 0) return dedupe(fromStack);

  const fromPkg = fromPackageJson(projectDir);
  const tags = [...fromPkg];

  if (existsSync(join(projectDir, "tsconfig.json"))) {
    tags.push("typescript");
  }

  return dedupe(tags);
}
