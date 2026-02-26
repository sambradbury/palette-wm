import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { homedir } from "node:os";
import { getPaletteHome, getProjectDir, getConfigPath, getWorkspacePath } from "../../src/lib/paths.js";

describe("paths", () => {
  const originalEnv = process.env.PALETTE_HOME;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PALETTE_HOME;
    } else {
      process.env.PALETTE_HOME = originalEnv;
    }
  });

  describe("getPaletteHome", () => {
    test("defaults to ~/palette", () => {
      delete process.env.PALETTE_HOME;
      expect(getPaletteHome()).toBe(join(homedir(), "palette"));
    });

    test("respects PALETTE_HOME env var", () => {
      process.env.PALETTE_HOME = "/custom/path";
      expect(getPaletteHome()).toBe("/custom/path");
    });
  });

  describe("getProjectDir", () => {
    test("returns project dir inside palette home", () => {
      process.env.PALETTE_HOME = "/test/home";
      expect(getProjectDir("myproject")).toBe("/test/home/myproject");
    });
  });

  describe("getConfigPath", () => {
    test("returns .palette.yaml inside project dir", () => {
      process.env.PALETTE_HOME = "/test/home";
      expect(getConfigPath("myproject")).toBe("/test/home/myproject/.palette.yaml");
    });
  });

  describe("getWorkspacePath", () => {
    test("returns <name>.code-workspace inside project dir", () => {
      process.env.PALETTE_HOME = "/test/home";
      expect(getWorkspacePath("myproject")).toBe("/test/home/myproject/myproject.code-workspace");
    });
  });
});
