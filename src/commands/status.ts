import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readConfig } from "../lib/config.js";
import { getStatus } from "../lib/git.js";
import { getProjectDir, getPaletteHome } from "../lib/paths.js";

export function statusCommand(projectName?: string): void {
  if (projectName) {
    printProjectStatus(projectName);
    return;
  }

  // Show status for all projects
  const paletteHome = getPaletteHome();
  if (!existsSync(paletteHome)) {
    console.log("No projects found.");
    return;
  }

  const projects = readdirSync(paletteHome, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(paletteHome, name, ".palette.yaml")));

  for (const name of projects) {
    console.log(`\n${name}`);
    printProjectStatus(name, "  ");
  }
}

function printProjectStatus(projectName: string, indent = ""): void {
  const config = readConfig(projectName);
  const projectDir = getProjectDir(projectName);

  if (Object.keys(config.repos).length === 0) {
    console.log(`${indent}(no repos)`);
    return;
  }

  for (const [repoName, repoConfig] of Object.entries(config.repos)) {
    const worktreePath = join(projectDir, repoName);

    if (!existsSync(worktreePath)) {
      console.log(`${indent}${repoName.padEnd(24)} ✗ worktree missing (expected: ${worktreePath})`);
      continue;
    }

    try {
      const status = getStatus(worktreePath);
      const dirtyFlag = status.dirty ? " *" : "";
      const syncInfo =
        status.ahead > 0 || status.behind > 0
          ? ` ↑${status.ahead} ↓${status.behind}`
          : "";
      const tracked = repoConfig.branch;
      const current = status.branch;
      const branchDisplay = current === tracked ? current : `${current} (expected: ${tracked})`;

      console.log(`${indent}${repoName.padEnd(24)} ${branchDisplay}${dirtyFlag}${syncInfo}`);
    } catch {
      console.log(`${indent}${repoName.padEnd(24)} (error reading status)`);
    }
  }
}
