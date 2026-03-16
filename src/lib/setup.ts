import { existsSync, readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

function matchPattern(pattern: string, filename: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$"
  );
  return regex.test(filename);
}

export function copyFiles(originPath: string, worktreePath: string, patterns: string[]): void {
  if (patterns.length === 0) return;

  let entries: string[];
  try {
    entries = readdirSync(originPath, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
  } catch {
    return;
  }

  for (const pattern of patterns) {
    const matched = entries.filter((name) => matchPattern(pattern, name));
    for (const name of matched) {
      const src = join(originPath, name);
      const dest = join(worktreePath, name);
      if (existsSync(dest)) continue;
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      console.log(`  Copied ${name}`);
    }
  }
}

function detectPackageManager(repoPath: string): string | null {
  if (existsSync(join(repoPath, "bun.lockb"))) return "bun install";
  if (existsSync(join(repoPath, "pnpm-lock.yaml"))) return "pnpm install";
  if (existsSync(join(repoPath, "yarn.lock"))) return "yarn install";
  if (existsSync(join(repoPath, "package-lock.json"))) return "npm install";
  if (existsSync(join(repoPath, "package.json"))) return "npm install";
  return null;
}

export function runInstall(worktreePath: string): void {
  const cmd = detectPackageManager(worktreePath);
  if (!cmd) return;

  const [bin, ...args] = cmd.split(" ");
  console.log(`  Running ${cmd}...`);
  const result = spawnSync(bin!, args, { cwd: worktreePath, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`  Install failed (exit ${result.status})`);
  }
}
