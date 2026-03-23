import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";
import { writeConfig, configExists } from "../lib/config.js";
import { generateWorkspaceFile } from "../lib/workspace.js";
import { addWorktree, isGitRepo, cloneRepo, findRepoByRemoteUrl } from "../lib/git.js";
import { getProjectDir, getPaletteHome } from "../lib/paths.js";
import { readSettings } from "../lib/settings.js";
import { copyFiles, runInstall } from "../lib/setup.js";
import type { ProjectConfig } from "../lib/config.js";

interface FromOptions {
  name?: string;
  baseDir?: string;
}

export function fromCommand(templateFile: string, options: FromOptions): void {
  const templatePath = resolve(templateFile);
  if (!existsSync(templatePath)) {
    console.error(`Template file not found: ${templatePath}`);
    process.exit(1);
  }

  const template = yaml.load(readFileSync(templatePath, "utf8")) as ProjectConfig;
  if (!template?.name || !template?.repos) {
    console.error("Invalid template: missing required fields (name, repos)");
    process.exit(1);
  }

  const projectName = options.name ?? template.name;

  const settings = readSettings();
  const rawBaseDir = options.baseDir ?? settings.base_dir;
  const baseDir = rawBaseDir ? resolve(rawBaseDir.replace(/^~/, process.env.HOME ?? "~")) : null;

  if (!baseDir) {
    console.error(
      `No base-dir configured. Run: palette config set base-dir <path>  or use --base-dir <path>`
    );
    process.exit(1);
  }

  if (configExists(projectName)) {
    console.error(`Project "${projectName}" already exists.`);
    process.exit(1);
  }

  const paletteHome = getPaletteHome();
  if (!existsSync(paletteHome)) {
    mkdirSync(paletteHome, { recursive: true });
  }

  const projectDir = getProjectDir(projectName);
  mkdirSync(projectDir, { recursive: true });

  const config: ProjectConfig = { name: projectName, repos: {} };

  for (const [repoName, repoConfig] of Object.entries(template.repos)) {
    const { origin, branch } = repoConfig;

    // Check if already cloned at base-dir/<repo-name>
    const expectedPath = join(baseDir, repoName);
    let localPath: string;

    if (existsSync(expectedPath) && isGitRepo(expectedPath)) {
      console.log(`Using existing repo at ${expectedPath}`);
      localPath = expectedPath;
    } else {
      // Search base-dir for any clone with matching remote URL
      const existing = findRepoByRemoteUrl(baseDir, origin);
      if (existing) {
        console.log(`Using existing repo at ${existing}`);
        localPath = existing;
      } else {
        console.log(`Cloning ${origin} into ${expectedPath}...`);
        cloneRepo(origin, expectedPath);
        localPath = expectedPath;
      }
    }

    const worktreePath = join(projectDir, repoName);
    console.log(`Adding worktree for "${repoName}" on branch "${branch}"...`);
    try {
      addWorktree(localPath, worktreePath, branch);
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : `Failed to add worktree for "${repoName}".`
      );
      process.exit(1);
    }

    copyFiles(localPath, worktreePath, settings.copy ?? []);
    if (settings.install) runInstall(worktreePath);

    config.repos[repoName] = { origin, branch };
  }

  writeConfig(config);
  generateWorkspaceFile(config);

  console.log(`Created project "${projectName}" at ${projectDir}`);
}
