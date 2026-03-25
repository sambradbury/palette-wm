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

const DEFAULT_AGENT_FILE = "AGENTS.md";

export function getAgentsPath(projectName: string, filename?: string): string {
  return join(getProjectDir(projectName), filename ?? DEFAULT_AGENT_FILE);
}

export function getSettingsPath(): string {
  return join(getPaletteHome(), ".settings.yaml");
}
