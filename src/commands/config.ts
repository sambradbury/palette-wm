import { existsSync, symlinkSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import yaml from "js-yaml";
import { readSettings, writeSettings } from "../lib/settings.js";
import { getPaletteHome } from "../lib/paths.js";

function linkPaletteIntoBaseDir(baseDir: string): void {
  const linkPath = join(baseDir, "palette");
  const target = getPaletteHome();

  if (linkPath === target) return;

  if (existsSync(linkPath) || lstatSync_safe(linkPath)) return;

  symlinkSync(target, linkPath);
  console.log(`Linked ${linkPath} → ${target}`);
}

function lstatSync_safe(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function configCommand(subcommand?: string, key?: string, value?: string): void {
  if (!subcommand) {
    const settings = readSettings();
    const output = yaml.dump(settings, { lineWidth: 120 }).trim();
    if (output === "{}") {
      console.log("(no settings configured)");
    } else {
      console.log(output);
    }
    return;
  }

  if (subcommand === "set") {
    if (key === "base-dir") {
      if (!value) {
        console.error("Usage: palette config set base-dir <path>");
        process.exit(1);
      }
      const resolved = resolve(value.replace(/^~/, process.env.HOME ?? "~"));
      if (!existsSync(resolved)) {
        console.error(`Path does not exist: ${resolved}`);
        process.exit(1);
      }
      const settings = readSettings();
      settings.base_dir = resolved;
      writeSettings(settings);
      console.log(`Set base-dir to ${resolved}`);
      linkPaletteIntoBaseDir(resolved);
      return;
    }

    if (key === "copy") {
      if (!value) {
        console.error("Usage: palette config set copy <pattern>");
        process.exit(1);
      }
      const settings = readSettings();
      const existing = settings.copy ?? [];
      if (existing.includes(value)) {
        console.log(`Pattern already in copy list: ${value}`);
        return;
      }
      settings.copy = [...existing, value];
      writeSettings(settings);
      console.log(`Added copy pattern: ${value}`);
      return;
    }

    if (key === "install") {
      if (value !== "true" && value !== "false") {
        console.error("Usage: palette config set install <true|false>");
        process.exit(1);
      }
      const settings = readSettings();
      settings.install = value === "true";
      writeSettings(settings);
      console.log(`Set install to ${settings.install}`);
      return;
    }

    if (key === "agent-instructions") {
      if (!value) {
        console.error("Usage: palette config set agent-instructions <text>");
        process.exit(1);
      }
      const settings = readSettings();
      settings.agent_instructions = value;
      writeSettings(settings);
      console.log("Set agent-instructions");
      return;
    }

    console.error(`Unknown key: ${key}`);
    console.error("Available keys: base-dir, copy, install, agent-instructions");
    process.exit(1);
  }

  if (subcommand === "unset") {
    if (key === "copy") {
      if (!value) {
        console.error("Usage: palette config unset copy <pattern>");
        process.exit(1);
      }
      const settings = readSettings();
      const existing = settings.copy ?? [];
      if (!existing.includes(value)) {
        console.error(`Pattern not in copy list: ${value}`);
        process.exit(1);
      }
      settings.copy = existing.filter((p) => p !== value);
      writeSettings(settings);
      console.log(`Removed copy pattern: ${value}`);
      return;
    }

    if (key === "agent-instructions") {
      const settings = readSettings();
      delete settings.agent_instructions;
      writeSettings(settings);
      console.log("Removed agent-instructions");
      return;
    }

    console.error(`Unknown key: ${key}`);
    console.error("Available keys: copy, agent-instructions");
    process.exit(1);
  }

  console.error(`Unknown subcommand: ${subcommand}`);
  process.exit(1);
}
