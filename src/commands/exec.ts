import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readConfig } from "../lib/config.js";
import { getProjectDir, detectProject } from "../lib/paths.js";

export function execCommand(args: string[]): void {
  const projectName = detectProject();
  if (!projectName) {
    console.error("Not inside a palette project directory.");
    process.exit(1);
  }

  const config = readConfig(projectName);
  const projectDir = getProjectDir(projectName);
  const repoNames = Object.keys(config.repos);

  if (repoNames.length === 0) {
    console.log("No repos in this project.");
    return;
  }

  let failures = 0;

  for (const repoName of repoNames) {
    const worktreePath = join(projectDir, repoName);

    if (!existsSync(worktreePath)) {
      console.log(`${repoName}: skipped (worktree missing)`);
      failures++;
      continue;
    }

    console.log(`\n${repoName}/`);
    const result = spawnSync(args[0], args.slice(1), {
      cwd: worktreePath,
      stdio: "inherit",
    });

    if (result.error) {
      console.error(`  ${result.error.message}`);
      failures++;
    } else if (result.status !== 0) {
      failures++;
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
}
