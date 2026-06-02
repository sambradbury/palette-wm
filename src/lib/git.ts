import { execSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export interface GitStatus {
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
}

export interface BranchCleanupResult {
  status: "deleted" | "kept" | "missing";
  reason?: "checked_out" | "diverged" | "no_base";
  baseRef?: string;
}

function run(cmd: string, cwd?: string): string {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function tryRun(cmd: string, cwd?: string): string | null {
  const result = spawnSync(cmd, { cwd, encoding: "utf8", shell: true });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export function isGitUrl(origin: string): boolean {
  return /^(https?:\/\/|git@|git:\/\/|ssh:\/\/)/.test(origin);
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

function refExists(repoPath: string, ref: string): boolean {
  return tryRun(`git show-ref --verify --quiet ${ref}`, repoPath) !== null;
}

function resolveRef(repoPath: string, ref: string): string | null {
  return tryRun(`git rev-parse ${ref}`, repoPath);
}

function fetchOrigin(repoPath: string): void {
  run("git fetch origin --prune", repoPath);
}

function tryFetchOrigin(repoPath: string): void {
  tryRun("git fetch origin --prune", repoPath);
}

function syncRemoteHead(repoPath: string): void {
  tryRun("git remote set-head origin -a", repoPath);
}

function hasOriginRemote(repoPath: string): boolean {
  return tryRun("git remote get-url origin", repoPath) !== null;
}

function isBranchCheckedOutInAnyWorktree(repoPath: string, branch: string): boolean {
  const output = tryRun("git worktree list --porcelain", repoPath);
  if (!output) return false;

  return output.split("\n").some((line) => line === `branch refs/heads/${branch}`);
}

function getRemoteDefaultBranch(repoPath: string): string | null {
  const symbolicRef = tryRun("git symbolic-ref --short refs/remotes/origin/HEAD", repoPath);
  if (symbolicRef?.startsWith("origin/")) {
    return symbolicRef.slice("origin/".length);
  }

  const lsRemoteOutput = tryRun("git ls-remote --symref origin HEAD", repoPath);
  if (lsRemoteOutput) {
    const headLine = lsRemoteOutput.split("\n").find((line) => line.startsWith("ref: "));
    const match = headLine?.match(/^ref:\s+refs\/heads\/(.+)\s+HEAD$/);
    if (match?.[1]) return match[1];
  }

  const remoteShow = tryRun("git remote show origin", repoPath);
  const match = remoteShow?.match(/HEAD branch:\s+(.+)/);
  return match?.[1]?.trim() ?? null;
}

function fetchRemoteBranch(repoPath: string, branch: string): void {
  run(`git fetch origin "refs/heads/${branch}:refs/remotes/origin/${branch}"`, repoPath);
}

function ensureLocalBranchMatchesRef(repoPath: string, branch: string, expectedRef: string): void {
  const localRef = resolveRef(repoPath, `refs/heads/${branch}`);
  const expected = resolveRef(repoPath, expectedRef);

  if (!localRef || !expected || localRef !== expected) {
    throw new Error(
      `Local branch "${branch}" already exists and does not match ${expectedRef}. ` +
        `Delete or rename the local branch, or choose a different --branch.`
    );
  }
}

export function cleanupLocalBranch(repoPath: string, branch: string): BranchCleanupResult {
  const resolvedRepo = resolve(repoPath);

  if (!existsSync(resolvedRepo)) {
    throw new Error(`Repository not found: ${resolvedRepo}`);
  }

  if (!isGitRepo(resolvedRepo)) {
    throw new Error(`Not a git repository: ${resolvedRepo}`);
  }

  if (!refExists(resolvedRepo, `refs/heads/${branch}`)) {
    return { status: "missing" };
  }

  if (isBranchCheckedOutInAnyWorktree(resolvedRepo, branch)) {
    return { status: "kept", reason: "checked_out" };
  }

  if (hasOriginRemote(resolvedRepo)) {
    tryFetchOrigin(resolvedRepo);
    syncRemoteHead(resolvedRepo);
  }

  const remoteBranchRef = `refs/remotes/origin/${branch}`;
  const baseRef = refExists(resolvedRepo, remoteBranchRef)
    ? remoteBranchRef
    : (() => {
        const defaultBranch = getRemoteDefaultBranch(resolvedRepo);
        return defaultBranch ? `refs/remotes/origin/${defaultBranch}` : null;
      })();

  if (!baseRef || !refExists(resolvedRepo, baseRef)) {
    return { status: "kept", reason: "no_base" };
  }

  const localRef = resolveRef(resolvedRepo, `refs/heads/${branch}`);
  const baseCommit = resolveRef(resolvedRepo, baseRef);

  if (!localRef || !baseCommit || localRef !== baseCommit) {
    return { status: "kept", reason: "diverged", baseRef };
  }

  run(`git branch -D "${branch}"`, resolvedRepo);
  return { status: "deleted", baseRef };
}

export function forceDeleteLocalBranch(repoPath: string, branch: string): void {
  const resolvedRepo = resolve(repoPath);
  run(`git branch -D "${branch}"`, resolvedRepo);
}

export function addWorktree(originPath: string, worktreePath: string, branch: string): void {
  const resolvedOrigin = resolve(originPath);

  if (!existsSync(resolvedOrigin)) {
    throw new Error(`Origin repo not found: ${resolvedOrigin}`);
  }

  if (!isGitRepo(resolvedOrigin)) {
    throw new Error(`Not a git repository: ${resolvedOrigin}`);
  }

  fetchOrigin(resolvedOrigin);
  syncRemoteHead(resolvedOrigin);

  const localBranchExists = refExists(resolvedOrigin, `refs/heads/${branch}`);
  const remoteBranchExists = refExists(resolvedOrigin, `refs/remotes/origin/${branch}`);

  if (remoteBranchExists) {
    if (localBranchExists) {
      ensureLocalBranchMatchesRef(resolvedOrigin, branch, `refs/remotes/origin/${branch}`);
      run(`git worktree add "${worktreePath}" ${branch}`, resolvedOrigin);
      return;
    }

    run(`git worktree add "${worktreePath}" --track -b ${branch} origin/${branch}`, resolvedOrigin);
    return;
  }

  const defaultBranch = getRemoteDefaultBranch(resolvedOrigin);

  if (!defaultBranch) {
    throw new Error(`Could not determine the default branch for origin in ${resolvedOrigin}`);
  }

  fetchRemoteBranch(resolvedOrigin, defaultBranch);

  if (localBranchExists) {
    ensureLocalBranchMatchesRef(resolvedOrigin, branch, `refs/remotes/origin/${defaultBranch}`);
    run(`git worktree add "${worktreePath}" ${branch}`, resolvedOrigin);
    return;
  }

  run(`git worktree add -b ${branch} "${worktreePath}" origin/${defaultBranch}`, resolvedOrigin);
}

/**
 * Returns the root directory of the main repository that owns a given worktree.
 * Works from any worktree path — no need to know base_dir.
 */
export function getMainRepoPath(worktreePath: string): string {
  const gitCommonDir = run("git rev-parse --git-common-dir", worktreePath);
  // gitCommonDir is e.g. /path/to/main/.git — its parent is the main repo root
  return dirname(resolve(worktreePath, gitCommonDir));
}

export function removeWorktree(worktreePath: string, force = false): void {
  const mainRepo = getMainRepoPath(worktreePath);
  const forceFlag = force ? " --force" : "";
  run(`git worktree remove "${worktreePath}"${forceFlag}`, mainRepo);
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

export function getRemoteUrl(repoPath: string): string {
  return run("git remote get-url origin", repoPath);
}

export function cloneRepo(remoteUrl: string, targetPath: string): void {
  execSync(`git clone "${remoteUrl}" "${targetPath}"`, { stdio: "inherit" });
}

function normalizeRemoteUrl(url: string): string {
  return url.trim().replace(/\.git$/, "");
}

/**
 * Scan immediate subdirectories of `baseDir` for a git repo whose origin remote
 * URL matches `remoteUrl`. Returns the path of the first match, or null.
 */
export function findRepoByRemoteUrl(baseDir: string, remoteUrl: string): string | null {
  if (!existsSync(baseDir)) return null;
  const normalized = normalizeRemoteUrl(remoteUrl);
  let entries: string[];
  try {
    entries = readdirSync(baseDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return null;
  }
  for (const name of entries) {
    const candidate = join(baseDir, name);
    if (!isGitRepo(candidate)) continue;
    const url = tryRun("git remote get-url origin", candidate);
    if (url && normalizeRemoteUrl(url) === normalized) {
      return candidate;
    }
  }
  return null;
}
