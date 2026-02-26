import { readFileSync, writeFileSync, existsSync } from "node:fs";
import yaml from "js-yaml";
import { getConfigPath } from "./paths.js";

export interface RepoConfig {
  origin: string;
  branch: string;
}

export interface ProjectConfig {
  name: string;
  repos: Record<string, RepoConfig>;
}

export function readConfig(projectName: string): ProjectConfig {
  const configPath = getConfigPath(projectName);
  if (!existsSync(configPath)) {
    throw new Error(`Project "${projectName}" not found. Run: palette init ${projectName}`);
  }
  return yaml.load(readFileSync(configPath, "utf8")) as ProjectConfig;
}

export function writeConfig(config: ProjectConfig): void {
  const configPath = getConfigPath(config.name);
  writeFileSync(configPath, yaml.dump(config, { lineWidth: 120 }), "utf8");
}

export function configExists(projectName: string): boolean {
  return existsSync(getConfigPath(projectName));
}
