import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectProject } from "../../src/lib/paths.js";

describe("detectProject", () => {
  const testDir = join(tmpdir(), `palette-exec-test-${Date.now()}`);
  const projectDir = join(testDir, "my-project");
  const repoDir = join(projectDir, "repo-a");
  const nestedDir = join(repoDir, "src", "deep");
  const originalCwd = process.cwd();

  beforeAll(() => {
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(projectDir, ".palette.yaml"), "name: my-project\nrepos: {}\n");
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  test("detects project from project root", () => {
    process.chdir(projectDir);
    expect(detectProject()).toBe("my-project");
  });

  test("detects project from a repo subdirectory", () => {
    process.chdir(repoDir);
    expect(detectProject()).toBe("my-project");
  });

  test("detects project from deeply nested directory", () => {
    process.chdir(nestedDir);
    expect(detectProject()).toBe("my-project");
  });

  test("returns null when not in a palette project", () => {
    process.chdir(tmpdir());
    expect(detectProject()).toBeNull();
  });
});
