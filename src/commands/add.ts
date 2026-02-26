import { resolve, basename } from "node:path";
import { existsSync } from "node:fs";
import { readConfig, writeConfig } from "../lib/config.js";
import { addWorktree, resolveRepoName, isGitRepo } from "../lib/git.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
import { getProjectDir } from "../lib/paths.js";

interface AddOptions {
  branch?: string;
  name?: string;
}

export function addCommand(projectName: string, repoPath: string, options: AddOptions): void {
  const config = readConfig(projectName);
  const resolvedRepo = resolve(repoPath);

  if (!existsSync(resolvedRepo)) {
    console.error(`Repo path does not exist: ${resolvedRepo}`);
    process.exit(1);
  }

  if (!isGitRepo(resolvedRepo)) {
    console.error(`Not a git repository: ${resolvedRepo}`);
    process.exit(1);
  }

  const repoName = options.name ?? resolveRepoName(resolvedRepo);
  const projectDir = getProjectDir(projectName);
  const worktreePath = `${projectDir}/${repoName}`;

  if (config.repos[repoName]) {
    console.error(`Repo "${repoName}" already added to project "${projectName}".`);
    console.error(`Use --name to add it under a different name.`);
    process.exit(1);
  }

  if (existsSync(worktreePath)) {
    console.error(`Directory already exists at ${worktreePath}`);
    process.exit(1);
  }

  const branch = options.branch ?? projectName;

  console.log(`Adding worktree for "${repoName}" on branch "${branch}"...`);
  addWorktree(resolvedRepo, worktreePath, branch);

  config.repos[repoName] = { origin: resolvedRepo, branch };
  writeConfig(config);
  generateWorkspaceFile(config);

  console.log(`Added "${repoName}" to project "${projectName}".`);
}
