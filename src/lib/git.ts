import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

export interface GitStatus {
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
}

function run(cmd: string, cwd?: string): string {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function tryRun(cmd: string, cwd?: string): string | null {
  const result = spawnSync(cmd, { cwd, encoding: "utf8", shell: true });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export function resolveRepoName(repoPath: string): string {
  const real = resolve(repoPath);
  const name = basename(real);
  // Strip .git suffix if pointing to a bare repo
  return name.endsWith(".git") ? name.slice(0, -4) : name;
}

export function isGitRepo(path: string): boolean {
  const result = spawnSync("git", ["rev-parse", "--git-dir"], {
    cwd: path,
    encoding: "utf8",
  });
  return result.status === 0;
}

export function currentBranch(repoPath: string): string {
  return run("git rev-parse --abbrev-ref HEAD", repoPath);
}

export function addWorktree(originPath: string, worktreePath: string, branch: string): void {
  const resolvedOrigin = resolve(originPath);

  if (!existsSync(resolvedOrigin)) {
    throw new Error(`Origin repo not found: ${resolvedOrigin}`);
  }

  if (!isGitRepo(resolvedOrigin)) {
    throw new Error(`Not a git repository: ${resolvedOrigin}`);
  }

  // Check if branch exists locally
  const branchExists = tryRun(`git show-ref --verify --quiet refs/heads/${branch}`, resolvedOrigin);

  if (branchExists === null) {
    // Try to track from remote
    const remoteExists = tryRun(
      `git show-ref --verify --quiet refs/remotes/origin/${branch}`,
      resolvedOrigin
    );

    if (remoteExists !== null) {
      run(`git worktree add "${worktreePath}" --track -b ${branch} origin/${branch}`, resolvedOrigin);
    } else {
      // Create new branch at HEAD
      run(`git worktree add -b ${branch} "${worktreePath}"`, resolvedOrigin);
    }
  } else {
    run(`git worktree add "${worktreePath}" ${branch}`, resolvedOrigin);
  }
}

export function removeWorktree(originPath: string, worktreePath: string, force = false): void {
  const resolvedOrigin = resolve(originPath);
  const forceFlag = force ? " --force" : "";
  run(`git worktree remove "${worktreePath}"${forceFlag}`, resolvedOrigin);
}

export function getStatus(worktreePath: string): GitStatus {
  const branch = tryRun("git rev-parse --abbrev-ref HEAD", worktreePath) ?? "unknown";
  const dirtyOutput = tryRun("git status --porcelain", worktreePath) ?? "";
  const dirty = dirtyOutput.length > 0;

  const aheadBehind = tryRun(
    "git rev-list --left-right --count @{upstream}...HEAD",
    worktreePath
  );

  let ahead = 0;
  let behind = 0;
  if (aheadBehind) {
    const parts = aheadBehind.split(/\s+/);
    behind = parseInt(parts[0] ?? "0", 10);
    ahead = parseInt(parts[1] ?? "0", 10);
  }

  return { branch, dirty, ahead, behind };
}

export function pullWorktree(worktreePath: string): void {
  run("git pull", worktreePath);
}
