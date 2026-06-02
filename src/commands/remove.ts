import { join } from "node:path";
import { existsSync } from "node:fs";
import { readConfig, writeConfig } from "../lib/config.js";
import { cleanupLocalBranch, getMainRepoPath, removeWorktree } from "../lib/git.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
import { generateAgentsFile } from "../lib/agents.js";
import { getProjectDir } from "../lib/paths.js";

interface RemoveOptions {
  force?: boolean;
}

export function removeCommand(projectName: string, repoName: string, options: RemoveOptions): void {
  const config = readConfig(projectName);

  if (!config.repos[repoName]) {
    console.error(`Repo "${repoName}" not found in project "${projectName}".`);
    process.exit(1);
  }

  const projectDir = getProjectDir(projectName);
  const worktreePath = join(projectDir, repoName);
  const branch = config.repos[repoName].branch;
  let mainRepoPath: string | null = null;

  if (existsSync(worktreePath)) {
    console.log(`Removing worktree at ${worktreePath}...`);

    try {
      mainRepoPath = getMainRepoPath(worktreePath);
      removeWorktree(worktreePath, options.force);
    } catch (err) {
      if (!options.force) {
        console.error(`Failed to remove worktree. If it has uncommitted changes, use --force.`);
        console.error((err as Error).message);
        process.exit(1);
      }
    }
  }

  if (mainRepoPath) {
    const result = cleanupLocalBranch(mainRepoPath, branch);

    if (result.status === "deleted") {
      console.log(`Deleted local branch "${branch}" in ${repoName}.`);
    } else if (result.status === "kept") {
      console.log(`Kept local branch "${branch}" in ${repoName} (${result.reason}).`);
    }
  }

  delete config.repos[repoName];
  writeConfig(config);
  generateWorkspaceFile(config);
  generateAgentsFile(config);

  console.log(`Removed "${repoName}" from project "${projectName}".`);
}
