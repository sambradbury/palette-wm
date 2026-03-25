import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { readConfig, writeConfig } from "../lib/config.js";
import { addWorktree, resolveRepoName, isGitRepo, getRemoteUrl } from "../lib/git.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
import { generateAgentsFile } from "../lib/agents.js";
import { getProjectDir } from "../lib/paths.js";
import { copyFiles, runInstall } from "../lib/setup.js";
import { readSettings } from "../lib/settings.js";

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

  let origin: string;
  try {
    origin = getRemoteUrl(resolvedRepo);
  } catch {
    console.error(`Repo at ${resolvedRepo} has no remote URL.`);
    console.error(`Add a remote first: git -C ${resolvedRepo} remote add origin <url>`);
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
  try {
    addWorktree(resolvedRepo, worktreePath, branch);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : `Failed to add worktree for "${repoName}".`
    );
    process.exit(1);
  }

  const settings = readSettings();
  copyFiles(resolvedRepo, worktreePath, settings.copy ?? []);
  if (settings.install) runInstall(worktreePath);

  config.repos[repoName] = { origin, branch };
  writeConfig(config);
  generateWorkspaceFile(config);
  generateAgentsFile(config);

  console.log(`Added "${repoName}" to project "${projectName}".`);
}
