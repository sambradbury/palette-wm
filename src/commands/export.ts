import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { readConfig } from "../lib/config.js";

export function exportCommand(projectName: string, outputFile?: string): void {
  const config = readConfig(projectName);
  const outPath = outputFile ? resolve(outputFile) : resolve(`${projectName}.palette.yaml`);
  writeFileSync(outPath, yaml.dump(config, { lineWidth: 120 }), "utf8");
  console.log(`Exported project "${projectName}" to ${outPath}`);
}
