import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import {
  isGitRepo,
  resolveRepoName,
  currentBranch,
  addWorktree,
  removeWorktree,
  getStatus,
} from "../../src/lib/git.js";

function initRepo(dir: string): void {
  mkdirSync(dir, { recursive: true });
  execSync("git init", { cwd: dir });
  execSync("git config user.email test@test.com", { cwd: dir });
  execSync("git config user.name Test", { cwd: dir });
  writeFileSync(join(dir, "README.md"), "# test");
  execSync("git add .", { cwd: dir });
  execSync("git commit -m 'initial'", { cwd: dir });
}

describe("git", () => {
  let tempDir: string;
  let repoPath: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `palette-git-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    repoPath = join(tempDir, "origin");
    initRepo(repoPath);
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

      removeWorktree(repoPath, worktreePath);

      // Directory should be gone after clean removal
      expect(existsSync(worktreePath)).toBe(false);
    });

    test("throws when origin path does not exist", () => {
      expect(() =>
        addWorktree(join(tempDir, "nonexistent"), join(tempDir, "wt"), "main")
      ).toThrow();
    });
  });

  describe("getStatus", () => {
    test("returns clean status for unmodified worktree", () => {
      const worktreePath = join(tempDir, "worktree-status");
      addWorktree(repoPath, worktreePath, "feature/status-test");

      const status = getStatus(worktreePath);
      expect(status.branch).toBe("feature/status-test");
      expect(status.dirty).toBe(false);

      removeWorktree(repoPath, worktreePath);
    });

    test("reports dirty when there are uncommitted changes", () => {
      const worktreePath = join(tempDir, "worktree-dirty");
      addWorktree(repoPath, worktreePath, "feature/dirty-test");

      writeFileSync(join(worktreePath, "new-file.txt"), "uncommitted");

      const status = getStatus(worktreePath);
      expect(status.dirty).toBe(true);

      removeWorktree(repoPath, worktreePath, true);
    });
  });
});
