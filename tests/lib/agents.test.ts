import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateAgentsFile } from "../../src/lib/agents.js";
import { getAgentsPath } from "../../src/lib/paths.js";
import { writeSettings } from "../../src/lib/settings.js";

describe("agents", () => {
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

  test("generates AGENTS.md for a project with no repos", () => {
    mkdirSync(join(tempHome, "empty"));
    generateAgentsFile({ name: "empty", repos: {} });

    const content = readFileSync(getAgentsPath("empty"), "utf8");
    expect(content).toContain("# empty");
    expect(content).toContain("No repositories have been added yet.");
  });

  test("generates repo table with names and branches", () => {
    mkdirSync(join(tempHome, "proj"));
    generateAgentsFile({
      name: "proj",
      repos: {
        backend: { origin: "/code/backend", branch: "feat/api" },
        frontend: { origin: "/code/frontend", branch: "feat/ui" },
      },
    });

    const content = readFileSync(getAgentsPath("proj"), "utf8");
    expect(content).toContain("| backend | feat/api |");
    expect(content).toContain("| frontend | feat/ui |");
  });

  test("includes project-specific instructions when set", () => {
    mkdirSync(join(tempHome, "proj"));
    generateAgentsFile({
      name: "proj",
      repos: {},
      instructions: "Always run tests before committing.",
    });

    const content = readFileSync(getAgentsPath("proj"), "utf8");
    expect(content).toContain("## Project instructions");
    expect(content).toContain("Always run tests before committing.");
  });

  test("includes global instructions from settings", () => {
    mkdirSync(join(tempHome, "proj"));
    writeSettings({ agent_instructions: "Use conventional commits." });
    generateAgentsFile({ name: "proj", repos: {} });

    const content = readFileSync(getAgentsPath("proj"), "utf8");
    expect(content).toContain("## Global instructions");
    expect(content).toContain("Use conventional commits.");
  });

  test("includes project commands with correct project name", () => {
    mkdirSync(join(tempHome, "my-app"));
    generateAgentsFile({ name: "my-app", repos: {} });

    const content = readFileSync(getAgentsPath("my-app"), "utf8");
    expect(content).toContain("palette status my-app");
    expect(content).toContain("palette sync my-app");
    expect(content).toContain("palette save my-app");
  });

  test("regeneration updates repo table", () => {
    mkdirSync(join(tempHome, "proj"));
    generateAgentsFile({
      name: "proj",
      repos: { backend: { origin: "/code/backend", branch: "main" } },
    });

    generateAgentsFile({
      name: "proj",
      repos: {
        backend: { origin: "/code/backend", branch: "main" },
        frontend: { origin: "/code/frontend", branch: "develop" },
      },
    });

    const content = readFileSync(getAgentsPath("proj"), "utf8");
    expect(content).toContain("| frontend | develop |");
  });

  test("omits global instructions section when not configured", () => {
    mkdirSync(join(tempHome, "proj"));
    generateAgentsFile({ name: "proj", repos: {} });

    const content = readFileSync(getAgentsPath("proj"), "utf8");
    expect(content).not.toContain("## Global instructions");
  });

  test("omits project instructions section when not configured", () => {
    mkdirSync(join(tempHome, "proj"));
    generateAgentsFile({ name: "proj", repos: {} });

    const content = readFileSync(getAgentsPath("proj"), "utf8");
    expect(content).not.toContain("## Project instructions");
  });
});
