#!/usr/bin/env bun
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

const program = new Command();

program
  .name("palette")
  .description("Manage multi-repo projects using git worktrees")
  .version("0.1.0");

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

program.parse();
