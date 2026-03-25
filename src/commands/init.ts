import { mkdirSync, existsSync } from "node:fs";
import { getProjectDir, getPaletteHome } from "../lib/paths.js";
import { writeConfig, configExists } from "../lib/config.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
import { generateAgentsFile } from "../lib/agents.js";

interface InitOptions {
  instructions?: string;
}

export function initCommand(projectName: string, options: InitOptions): void {
  const paletteHome = getPaletteHome();
  if (!existsSync(paletteHome)) {
    mkdirSync(paletteHome, { recursive: true });
  }

  if (configExists(projectName)) {
    console.error(`Project "${projectName}" already exists.`);
    process.exit(1);
  }

  const projectDir = getProjectDir(projectName);
  mkdirSync(projectDir, { recursive: true });

  const config = {
    name: projectName,
    repos: {},
    ...(options.instructions ? { instructions: options.instructions } : {}),
  };
  writeConfig(config);
  generateWorkspaceFile(config);
  generateAgentsFile(config);

  console.log(`Created project "${projectName}" at ${projectDir}`);
  console.log(`Add repos with: palette add ${projectName} <path/to/repo> --branch <branch>`);
}
