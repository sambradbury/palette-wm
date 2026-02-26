import { writeFileSync } from "node:fs";
import { getWorkspacePath } from "./paths.js";
import type { ProjectConfig } from "./config.js";

interface CodeWorkspace {
  folders: Array<{ path: string; name?: string }>;
  settings: Record<string, unknown>;
}

export function generateWorkspaceFile(config: ProjectConfig): void {
  const workspace: CodeWorkspace = {
    folders: Object.keys(config.repos).map((name) => ({ path: name })),
    settings: {},
  };

  const outputPath = getWorkspacePath(config.name);
  writeFileSync(outputPath, JSON.stringify(workspace, null, 2) + "\n", "utf8");
}
