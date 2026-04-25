import { simpleGit } from "simple-git";
import { WIKI_DIR } from "./storage/paths";

export async function commitAll(message: string, wikiDir: string = WIKI_DIR): Promise<void> {
  const git = simpleGit(wikiDir);
  await git.add(".");
  try {
    await git.commit(message);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("nothing to commit")) return;
    throw new Error(`Git commit failed: ${msg}`);
  }
}

export async function pushOrigin(wikiDir: string = WIKI_DIR): Promise<void> {
  const git = simpleGit(wikiDir);
  await git.push("origin", "main");
}
