import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { readConfig } from "../lib/config.js";
import { cleanupLocalBranch, getMainRepoPath, removeWorktree } from "../lib/git.js";
import { getProjectDir } from "../lib/paths.js";

interface DeleteOptions {
  force?: boolean;
}

export function deleteCommand(projectName: string, options: DeleteOptions): void {
  const config = readConfig(projectName);
  const projectDir = getProjectDir(projectName);

  for (const [repoName, repoConfig] of Object.entries(config.repos)) {
    const worktreePath = join(projectDir, repoName);
    if (!existsSync(worktreePath)) continue;

    console.log(`Removing worktree: ${repoName}...`);

    try {
      const mainRepoPath = getMainRepoPath(worktreePath);
      removeWorktree(worktreePath, options.force);

      const result = cleanupLocalBranch(mainRepoPath, repoConfig.branch);
      if (result.status === "deleted") {
        console.log(`Deleted local branch "${repoConfig.branch}" in ${repoName}.`);
      } else if (result.status === "kept") {
        console.log(`Kept local branch "${repoConfig.branch}" in ${repoName} (${result.reason}).`);
      }
    } catch (err) {
      if (!options.force) {
        console.error(`Failed to remove worktree "${repoName}". Use --force to override.`);
        console.error((err as Error).message);
        process.exit(1);
      }
      rmSync(worktreePath, { recursive: true, force: true });
    }
  }

  rmSync(projectDir, { recursive: true, force: true });
  console.log(`Deleted project "${projectName}".`);
}
