import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { readConfig } from "../lib/config.js";
import { cleanupLocalBranch, forceDeleteLocalBranch, getMainRepoPath, removeWorktree } from "../lib/git.js";
import { getProjectDir } from "../lib/paths.js";

interface DeleteOptions {
  force?: boolean;
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

export async function deleteCommand(projectName: string, options: DeleteOptions): Promise<void> {
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
        if (result.reason === "diverged") {
          const confirmed = await promptYesNo(
            `Local branch "${repoConfig.branch}" in ${repoName} has diverged from remote. Force delete?`
          );
          if (confirmed) {
            forceDeleteLocalBranch(mainRepoPath, repoConfig.branch);
            console.log(`Force deleted local branch "${repoConfig.branch}" in ${repoName}.`);
          } else {
            console.log(`Kept local branch "${repoConfig.branch}" in ${repoName}.`);
          }
        } else {
          console.log(`Kept local branch "${repoConfig.branch}" in ${repoName} (${result.reason}).`);
        }
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
