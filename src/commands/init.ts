import { mkdirSync, existsSync } from "node:fs";
import { getProjectDir } from "../lib/paths.js";
import { writeConfig, configExists } from "../lib/config.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
import { getPaletteHome } from "../lib/paths.js";

export function initCommand(projectName: string): void {
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

  const config = { name: projectName, repos: {} };
  writeConfig(config);
  generateWorkspaceFile(config);

  console.log(`Created project "${projectName}" at ${projectDir}`);
  console.log(`Add repos with: palette add ${projectName} <path/to/repo> --branch <branch>`);
}
