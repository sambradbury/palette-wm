import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import yaml from "js-yaml";
import { getSettingsPath, getPaletteHome } from "./paths.js";

export interface PaletteSettings {
  base_dir?: string;
  copy?: string[];
  install?: boolean;
}

export function readSettings(): PaletteSettings {
  const settingsPath = getSettingsPath();
  if (!existsSync(settingsPath)) {
    return {};
  }
  return (yaml.load(readFileSync(settingsPath, "utf8")) as PaletteSettings) ?? {};
}

export function writeSettings(settings: PaletteSettings): void {
  const paletteHome = getPaletteHome();
  if (!existsSync(paletteHome)) {
    mkdirSync(paletteHome, { recursive: true });
  }
  writeFileSync(getSettingsPath(), yaml.dump(settings, { lineWidth: 120 }), "utf8");
}
