import { spawnSync } from "node:child_process";
import { readConfig } from "../lib/config.js";
import { getProjectDir, getWorkspacePath } from "../lib/paths.js";

interface OpenOptions {
  editor?: string;
}

const EDITOR_COMMANDS: Record<string, string> = {
  cursor: "cursor",
  code: "code",
  zed: "zed",
};

export function openCommand(projectName: string, options: OpenOptions): void {
  readConfig(projectName); // validates project exists

  const editor = options.editor ?? detectEditor();
  const target = editor ? getWorkspacePath(projectName) : getProjectDir(projectName);
  const cmd = editor ? (EDITOR_COMMANDS[editor] ?? editor) : "open";

  const result = spawnSync(cmd, [target], { stdio: "inherit" });
  if (result.error) {
    console.error(`Failed to launch "${cmd}": ${result.error.message}`);
    process.exit(1);
  }
}

function detectEditor(): string | undefined {
  const editors = ["cursor", "code", "zed"];
  for (const editor of editors) {
    const result = spawnSync("which", [editor], { encoding: "utf8" });
    if (result.status === 0) return editor;
  }
  return undefined;
}
