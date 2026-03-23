import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import {
  isGitRepo,
  resolveRepoName,
  currentBranch,
  addWorktree,
  cleanupLocalBranch,
  removeWorktree,
  getStatus,
} from "../../src/lib/git.js";

function git(command: string, cwd: string): string {
  return execSync(command, { cwd, encoding: "utf8" }).trim();
}

function gitSucceeds(command: string, cwd: string): boolean {
  try {
    git(command, cwd);
    return true;
  } catch {
    return false;
  }
}

function initRepo(dir: string): void {
  mkdirSync(dir, { recursive: true });
  git("git init", dir);
  git("git config user.email test@test.com", dir);
  git("git config user.name Test", dir);
  writeFileSync(join(dir, "README.md"), "# test");
  git("git add .", dir);
  git("git commit -m 'initial'", dir);
}

function initRemoteRepo(remotePath: string, clonePath: string): void {
  const seedPath = join(dirname(remotePath), `${basename(remotePath, ".git")}-seed`);

  mkdirSync(remotePath, { recursive: true });
  git("git init --bare", remotePath);

  initRepo(seedPath);
  git("git branch -M main", seedPath);
  git(`git remote add origin \"${remotePath}\"`, seedPath);
  git("git push -u origin main", seedPath);

  git(`git clone \"${remotePath}\" \"${clonePath}\"`, dirname(remotePath));
  git("git config user.email test@test.com", clonePath);
  git("git config user.name Test", clonePath);
}

describe("git", () => {
  let tempDir: string;
  let repoPath: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `palette-git-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    repoPath = join(tempDir, "origin-clone");
    initRemoteRepo(join(tempDir, "origin.git"), repoPath);
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("isGitRepo", () => {
    test("returns true for a git repo", () => {
      expect(isGitRepo(repoPath)).toBe(true);
    });

    test("returns false for a plain directory", () => {
      const plain = join(tempDir, "plain");
      mkdirSync(plain);
      expect(isGitRepo(plain)).toBe(false);
    });

    test("returns false for a nonexistent path", () => {
      expect(isGitRepo(join(tempDir, "nope"))).toBe(false);
    });
  });

  describe("resolveRepoName", () => {
    test("returns the directory basename", () => {
      expect(resolveRepoName("/home/user/code/my-service")).toBe("my-service");
    });

    test("strips .git suffix from bare repos", () => {
      expect(resolveRepoName("/repos/project.git")).toBe("project");
    });
  });

  describe("currentBranch", () => {
    test("returns the current branch name", () => {
      const branch = currentBranch(repoPath);
      // git init defaults to 'main' or 'master' depending on config
      expect(["main", "master"]).toContain(branch);
    });
  });

  describe("addWorktree / removeWorktree", () => {
    test("creates a worktree on a new branch and removes it cleanly", () => {
      const worktreePath = join(tempDir, "worktree-a");

      addWorktree(repoPath, worktreePath, "feature/test-branch");

      expect(isGitRepo(worktreePath)).toBe(true);
      expect(currentBranch(worktreePath)).toBe("feature/test-branch");

      removeWorktree(worktreePath);

      // Directory should be gone after clean removal
      expect(existsSync(worktreePath)).toBe(false);
    });

    test("throws when origin path does not exist", () => {
      expect(() =>
        addWorktree(join(tempDir, "nonexistent"), join(tempDir, "wt"), "main")
      ).toThrow();
    });

    test("creates new branches from the fetched remote default branch", () => {
      const remotePath = join(tempDir, "remote.git");
      const clonePath = join(tempDir, "clone");
      const worktreePath = join(tempDir, "worktree-default-base");

      initRemoteRepo(remotePath, clonePath);

      git("git checkout -b local-only-base", clonePath);
      writeFileSync(join(clonePath, "local-only.txt"), "local branch commit");
      git("git add .", clonePath);
      git("git commit -m 'local only base'", clonePath);

      const defaultBranchHead = git("git rev-parse origin/main", clonePath);

      addWorktree(clonePath, worktreePath, "feature/from-default");

      expect(currentBranch(worktreePath)).toBe("feature/from-default");
      expect(git("git rev-parse HEAD", worktreePath)).toBe(defaultBranchHead);
      expect(git("git rev-parse HEAD", clonePath)).not.toBe(defaultBranchHead);

      removeWorktree(worktreePath);
    });

    test("rejects local-only branches that diverge from the remote default base", () => {
      const remotePath = join(tempDir, "remote-local-only.git");
      const clonePath = join(tempDir, "clone-local-only");
      const worktreePath = join(tempDir, "worktree-local-only");

      initRemoteRepo(remotePath, clonePath);

      git("git checkout -b feature/existing-local", clonePath);
      writeFileSync(join(clonePath, "local-only.txt"), "local branch commit");
      git("git add .", clonePath);
      git("git commit -m 'local only branch'", clonePath);
      git("git checkout main", clonePath);

      expect(() => addWorktree(clonePath, worktreePath, "feature/existing-local")).toThrow(
        /Local branch "feature\/existing-local" already exists/
      );
      expect(existsSync(worktreePath)).toBe(false);
    });
  });

  describe("getStatus", () => {
    test("returns clean status for unmodified worktree", () => {
      const worktreePath = join(tempDir, "worktree-status");
      addWorktree(repoPath, worktreePath, "feature/status-test");

      const status = getStatus(worktreePath);
      expect(status.branch).toBe("feature/status-test");
      expect(status.dirty).toBe(false);

      removeWorktree(worktreePath);
    });

    test("reports dirty when there are uncommitted changes", () => {
      const worktreePath = join(tempDir, "worktree-dirty");
      addWorktree(repoPath, worktreePath, "feature/dirty-test");

      writeFileSync(join(worktreePath, "new-file.txt"), "uncommitted");

      const status = getStatus(worktreePath);
      expect(status.dirty).toBe(true);

      removeWorktree(worktreePath, true);
    });
  });

  describe("cleanupLocalBranch", () => {
    test("deletes stale local branches that still match the remote default base", () => {
      const remotePath = join(tempDir, "cleanup-remote.git");
      const clonePath = join(tempDir, "cleanup-clone");

      initRemoteRepo(remotePath, clonePath);
      git("git branch feature/reused origin/main", clonePath);

      const result = cleanupLocalBranch(clonePath, "feature/reused");

      expect(result.status).toBe("deleted");
      expect(gitSucceeds("git show-ref --verify --quiet refs/heads/feature/reused", clonePath)).toBe(
        false
      );
    });

    test("keeps diverged local branches when cleaning up", () => {
      const remotePath = join(tempDir, "cleanup-diverged-remote.git");
      const clonePath = join(tempDir, "cleanup-diverged-clone");

      initRemoteRepo(remotePath, clonePath);
      git("git checkout -b feature/diverged", clonePath);
      writeFileSync(join(clonePath, "diverged.txt"), "local branch commit");
      git("git add .", clonePath);
      git("git commit -m 'diverged branch'", clonePath);
      git("git checkout main", clonePath);

      const result = cleanupLocalBranch(clonePath, "feature/diverged");

      expect(result.status).toBe("kept");
      expect(result.reason).toBe("diverged");
      expect(gitSucceeds("git show-ref --verify --quiet refs/heads/feature/diverged", clonePath)).toBe(
        true
      );
    });
  });
});
