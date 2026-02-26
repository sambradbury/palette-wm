import { join } from "node:path";
import { existsSync } from "node:fs";
import { readConfig, writeConfig } from "../lib/config.js";
import { currentBranch } from "../lib/git.js";
import { getProjectDir } from "../lib/paths.js";

export function saveCommand(projectName: string): void {
  const config = readConfig(projectName);
  const projectDir = getProjectDir(projectName);
  let changed = false;

  for (const [repoName, repoConfig] of Object.entries(config.repos)) {
    const worktreePath = join(projectDir, repoName);

    if (!existsSync(worktreePath)) {
      console.log(`  ${repoName}: skipped (worktree missing)`);
      continue;
    }

    try {
      const branch = currentBranch(worktreePath);
      if (branch !== repoConfig.branch) {
        console.log(`  ${repoName}: ${repoConfig.branch} → ${branch}`);
        config.repos[repoName].branch = branch;
        changed = true;
      } else {
        console.log(`  ${repoName}: ${branch} (unchanged)`);
      }
    } catch {
      console.log(`  ${repoName}: could not read branch`);
    }
  }

  if (changed) {
    writeConfig(config);
    console.log(`\nSaved branch state to .palette.yaml`);
  } else {
    console.log(`\nNo changes to save.`);
  }
}
