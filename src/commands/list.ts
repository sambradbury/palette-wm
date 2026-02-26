import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getPaletteHome } from "../lib/paths.js";
import { readConfig } from "../lib/config.js";

export function listCommand(): void {
  const paletteHome = getPaletteHome();

  if (!existsSync(paletteHome)) {
    console.log("No projects yet. Create one with: palette init <name>");
    return;
  }

  const entries = readdirSync(paletteHome, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(paletteHome, name, ".palette.yaml")));

  if (entries.length === 0) {
    console.log("No projects yet. Create one with: palette init <name>");
    return;
  }

  for (const name of entries) {
    try {
      const config = readConfig(name);
      const repoCount = Object.keys(config.repos).length;
      const repos = Object.keys(config.repos).join(", ") || "(no repos)";
      console.log(`  ${name.padEnd(20)} ${repoCount} repo${repoCount !== 1 ? "s" : ""}  [${repos}]`);
    } catch {
      console.log(`  ${name.padEnd(20)} (invalid config)`);
    }
  }
}
