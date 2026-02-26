import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateWorkspaceFile } from "../../src/lib/workspace.js";
import { getWorkspacePath } from "../../src/lib/paths.js";

describe("workspace", () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = join(tmpdir(), `palette-test-${Date.now()}`);
    mkdirSync(tempHome, { recursive: true });
    process.env.PALETTE_HOME = tempHome;
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
    delete process.env.PALETTE_HOME;
  });

  test("generates an empty workspace file for a project with no repos", () => {
    mkdirSync(join(tempHome, "empty"));
    generateWorkspaceFile({ name: "empty", repos: {} });

    const content = JSON.parse(readFileSync(getWorkspacePath("empty"), "utf8"));
    expect(content.folders).toEqual([]);
    expect(content.settings).toEqual({});
  });

  test("generates folder entries for each repo", () => {
    mkdirSync(join(tempHome, "proj"));
    generateWorkspaceFile({
      name: "proj",
      repos: {
        backend: { origin: "/code/backend", branch: "main" },
        frontend: { origin: "/code/frontend", branch: "main" },
      },
    });

    const content = JSON.parse(readFileSync(getWorkspacePath("proj"), "utf8"));
    expect(content.folders).toEqual([{ path: "backend" }, { path: "frontend" }]);
  });

  test("uses relative paths (repo name only, not absolute origin path)", () => {
    mkdirSync(join(tempHome, "proj"));
    generateWorkspaceFile({
      name: "proj",
      repos: {
        "my-service": { origin: "/Users/me/code/my-service", branch: "feature/x" },
      },
    });

    const content = JSON.parse(readFileSync(getWorkspacePath("proj"), "utf8"));
    expect(content.folders[0].path).toBe("my-service");
  });

  test("regenerating workspace updates folder list", () => {
    mkdirSync(join(tempHome, "proj"));
    generateWorkspaceFile({
      name: "proj",
      repos: { backend: { origin: "/code/backend", branch: "main" } },
    });

    generateWorkspaceFile({
      name: "proj",
      repos: {
        backend: { origin: "/code/backend", branch: "main" },
        frontend: { origin: "/code/frontend", branch: "main" },
      },
    });

    const content = JSON.parse(readFileSync(getWorkspacePath("proj"), "utf8"));
    expect(content.folders).toHaveLength(2);
  });
});
