import { join } from "node:path";
import { existsSync } from "node:fs";
import { readConfig, writeConfig } from "../lib/config.js";
import { removeWorktree } from "../lib/git.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
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
  const { origin } = config.repos[repoName];

  if (existsSync(worktreePath)) {
    console.log(`Removing worktree at ${worktreePath}...`);
    try {
      removeWorktree(origin, worktreePath, options.force);
    } catch (err) {
      if (!options.force) {
        console.error(`Failed to remove worktree. If it has uncommitted changes, use --force.`);
        console.error((err as Error).message);
        process.exit(1);
      }
    }
  }

  delete config.repos[repoName];
  writeConfig(config);
  generateWorkspaceFile(config);

  console.log(`Removed "${repoName}" from project "${projectName}".`);
}
