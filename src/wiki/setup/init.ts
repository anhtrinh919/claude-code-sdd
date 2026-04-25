import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { WIKI_DIR } from "../storage/paths";

const DEFAULT_REMOTE = "https://github.com/anhtrinh919/claude-wiki.git";

export async function initWiki(
  wikiDir: string = WIKI_DIR,
  remoteUrl: string = process.env["WIKI_REMOTE"] ?? DEFAULT_REMOTE
): Promise<void> {
  const entriesDir = join(wikiDir, "entries");
  const archivedDir = join(entriesDir, "archived");

  mkdirSync(archivedDir, { recursive: true });

  const gitignorePath = join(wikiDir, ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, "*.tmp\n");
  }

  const git = simpleGit(wikiDir);
  const hasGitDir = existsSync(join(wikiDir, ".git"));

  if (!hasGitDir) {
    await git.init();
    await git.raw(["checkout", "-b", "main"]).catch(() => {});
  }

  if (remoteUrl) {
    const remotes = await git.getRemotes();
    const hasOrigin = remotes.some((r) => r.name === "origin");
    if (!hasOrigin) {
      await git.addRemote("origin", remoteUrl);
    }
  }
}
