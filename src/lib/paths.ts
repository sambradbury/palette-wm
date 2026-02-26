import { homedir } from "node:os";
import { join } from "node:path";

export function getPaletteHome(): string {
  return process.env.PALETTE_HOME ?? join(homedir(), "palette");
}

export function getProjectDir(projectName: string): string {
  return join(getPaletteHome(), projectName);
}

export function getConfigPath(projectName: string): string {
  return join(getProjectDir(projectName), ".palette.yaml");
}

export function getWorkspacePath(projectName: string): string {
  return join(getProjectDir(projectName), `${projectName}.code-workspace`);
}
