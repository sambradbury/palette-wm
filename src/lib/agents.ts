import { writeFileSync } from "node:fs";
import { getAgentsPath } from "./paths.js";
import { readSettings } from "./settings.js";
import type { ProjectConfig } from "./config.js";

export function generateAgentsFile(config: ProjectConfig): void {
  const settings = readSettings();
  const content = buildAgentsContent(config, settings.agent_instructions);
  writeFileSync(getAgentsPath(config.name), content, "utf8");
}

function buildAgentsContent(config: ProjectConfig, globalInstructions?: string): string {
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push("");
  lines.push(
    "This is a **palette** project directory. It contains multiple git repositories managed as worktrees, all checked out simultaneously for cross-repo development."
  );

  lines.push("");
  lines.push("## Project layout");
  lines.push("");
  lines.push(
    "Each subdirectory is an independent git worktree on its own branch. Run git commands directly inside each subdirectory."
  );
  lines.push("");

  const repos = Object.entries(config.repos);
  if (repos.length > 0) {
    lines.push("| Repo | Branch |");
    lines.push("| ---- | ------ |");
    for (const [name, repo] of repos) {
      lines.push(`| ${name} | ${repo.branch} |`);
    }
  } else {
    lines.push("No repositories have been added yet.");
  }

  lines.push("");
  lines.push("## Configuration");
  lines.push("");
  lines.push("- `.palette.yaml` -- project config (repos, branches, and instructions)");
  lines.push(`- \`${config.name}.code-workspace\` -- VS Code workspace file`);

  lines.push("");
  lines.push("## Useful commands");
  lines.push("");
  lines.push("```bash");
  lines.push(`palette status ${config.name}    # branch, dirty state, ahead/behind for all repos`);
  lines.push(`palette sync ${config.name}      # pull latest changes in all repos`);
  lines.push(`palette save ${config.name}      # persist current branch state to config`);
  lines.push(`palette add ${config.name} <repo-path>  # add another repo`);
  lines.push(`palette remove ${config.name} <repo>    # remove a repo`);
  lines.push("```");

  if (globalInstructions) {
    lines.push("");
    lines.push("## Global instructions");
    lines.push("");
    lines.push(globalInstructions);
  }

  if (config.instructions) {
    lines.push("");
    lines.push("## Project instructions");
    lines.push("");
    lines.push(config.instructions);
  }

  lines.push("");
  return lines.join("\n");
}
