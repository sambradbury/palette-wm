import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { readConfig } from "../lib/config.js";
import { pullWorktree } from "../lib/git.js";
import { getProjectDir, getPaletteHome } from "../lib/paths.js";

export function syncCommand(projectName?: string): void {
  if (projectName) {
    syncProject(projectName);
    return;
  }

  const paletteHome = getPaletteHome();
  if (!existsSync(paletteHome)) {
    console.log("No projects found.");
    return;
  }

  const projects = readdirSync(paletteHome, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(`${paletteHome}/${name}/.palette.yaml`));

  for (const name of projects) {
    console.log(`\nSyncing ${name}...`);
    syncProject(name);
  }
}

function syncProject(projectName: string): void {
  const config = readConfig(projectName);
  const projectDir = getProjectDir(projectName);

  for (const repoName of Object.keys(config.repos)) {
    const worktreePath = join(projectDir, repoName);

    if (!existsSync(worktreePath)) {
      console.log(`  ${repoName}: skipped (worktree missing)`);
      continue;
    }

    try {
      process.stdout.write(`  ${repoName}: pulling... `);
      pullWorktree(worktreePath);
      console.log("done");
    } catch (err) {
      console.log(`failed\n    ${(err as Error).message}`);
    }
  }
}
