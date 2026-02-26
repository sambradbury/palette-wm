import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, writeConfig, configExists } from "../../src/lib/config.js";

function makeTempHome(): string {
  const dir = join(tmpdir(), `palette-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("config", () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = makeTempHome();
    process.env.PALETTE_HOME = tempHome;
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
    delete process.env.PALETTE_HOME;
  });

  describe("configExists", () => {
    test("returns false when project does not exist", () => {
      expect(configExists("nonexistent")).toBe(false);
    });

    test("returns true after writing config", () => {
      mkdirSync(join(tempHome, "myproject"));
      writeConfig({ name: "myproject", repos: {} });
      expect(configExists("myproject")).toBe(true);
    });
  });

  describe("writeConfig / readConfig", () => {
    test("round-trips a config with no repos", () => {
      mkdirSync(join(tempHome, "empty"));
      const config = { name: "empty", repos: {} };
      writeConfig(config);
      expect(readConfig("empty")).toEqual(config);
    });

    test("round-trips a config with repos", () => {
      mkdirSync(join(tempHome, "proj"));
      const config = {
        name: "proj",
        repos: {
          backend: { origin: "/code/backend", branch: "feature/x" },
          frontend: { origin: "/code/frontend", branch: "main" },
        },
      };
      writeConfig(config);
      expect(readConfig("proj")).toEqual(config);
    });

    test("overwrites existing config on write", () => {
      mkdirSync(join(tempHome, "proj"));
      writeConfig({ name: "proj", repos: { backend: { origin: "/old", branch: "main" } } });
      writeConfig({ name: "proj", repos: {} });
      expect(readConfig("proj")).toEqual({ name: "proj", repos: {} });
    });
  });

  describe("readConfig", () => {
    test("throws a helpful error when project does not exist", () => {
      expect(() => readConfig("ghost")).toThrow('Project "ghost" not found');
    });
  });
});
