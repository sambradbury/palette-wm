#!/usr/bin/env bun
import { createRequire } from "node:module";
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { openCommand } from "./commands/open.js";
import { listCommand } from "./commands/list.js";
import { statusCommand } from "./commands/status.js";
import { removeCommand } from "./commands/remove.js";
import { deleteCommand } from "./commands/delete.js";
import { syncCommand } from "./commands/sync.js";
import { saveCommand } from "./commands/save.js";
import { fromCommand } from "./commands/from.js";
import { exportCommand } from "./commands/export.js";
import { configCommand } from "./commands/config.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const program = new Command();

program
  .name("palette")
  .description("Manage multi-repo projects using git worktrees")
  .version(version);

program
  .command("init <name>")
  .description("Create a new project")
  .action(initCommand);

program
  .command("add <project> <repo-path>")
  .description("Add a repo to a project as a git worktree")
  .option("-b, --branch <branch>", "Branch to use (default: project name)")
  .option("-n, --name <name>", "Override the repo name within the project")
  .action(addCommand);

program
  .command("open <project>")
  .description("Open a project in your editor")
  .option("-e, --editor <editor>", "Editor to use (cursor, code, zed, or any command)")
  .action(openCommand);

program
  .command("list")
  .alias("ls")
  .description("List all projects")
  .action(listCommand);

program
  .command("status [project]")
  .description("Show git status across all repos in a project (or all projects)")
  .action(statusCommand);

program
  .command("remove <project> <repo>")
  .alias("rm")
  .description("Remove a repo from a project")
  .option("-f, --force", "Force removal even with uncommitted changes")
  .action(removeCommand);

program
  .command("delete <project>")
  .description("Delete a project and all its worktrees")
  .option("-f, --force", "Force deletion even with uncommitted changes")
  .action(deleteCommand);

program
  .command("sync [project]")
  .description("Pull latest changes in all repos of a project (or all projects)")
  .action(syncCommand);

program
  .command("save <project>")
  .description("Snapshot current branch state back into .palette.yaml")
  .action(saveCommand);

program
  .command("from <template-file>")
  .description("Create a project from a .palette.yaml template file")
  .option("-n, --name <name>", "Override the project name")
  .option("--base-dir <path>", "Override the configured base directory for repo clones")
  .action(fromCommand);

program
  .command("export <project> [output-file]")
  .description("Export a project to a shareable .palette.yaml template with remote URLs")
  .action(exportCommand);

program
  .command("config [subcommand] [key] [value]")
  .description("View or modify palette settings")
  .addHelpText(
    "after",
    `
Subcommands:
  (none)               Show all current settings
  set <key> <value>    Set a config value
  unset <key> <value>  Remove a value (for list settings like copy)

Keys:
  base-dir <path>
    The directory where new git worktrees are created when adding repos to a
    project. Palette will also create a symlink inside this directory pointing
    to the palette data folder (~/.palette) for easy browsing.
    Example: palette config set base-dir ~/code

  copy <pattern>
    A file glob pattern to copy from the existing worktree into each new
    worktree when running "palette add". Useful for files that are gitignored
    but required locally (e.g. .env files, local config). Can be set multiple
    times to build a list of patterns.
    Example: palette config set copy .env
    Example: palette config set copy .env.local
    Example: palette config unset copy .env

  install <true|false>
    Whether to automatically run the detected package manager install command
    (e.g. npm install, bun install) after creating a new worktree. Defaults
    to false.
    Example: palette config set install true`
  )
  .action(configCommand);

program.parse();
