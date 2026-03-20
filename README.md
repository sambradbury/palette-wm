# palette

> Manage multi-repo projects using git worktrees — switch contexts instantly, no stashing, no branch juggling.

## The problem

When you're working across multiple projects that share some of the same repos, context-switching is painful. Checking out a different branch means stashing work or committing early. Opening a different set of repos in your editor means manually reconfiguring workspaces. The more projects you juggle, the worse it gets.

## How palette solves it

Each project gets its own directory containing **git worktrees** — real, fully-functional checkouts of each repo on their own branch, all coexisting at the same time. No stashing, no branch collisions, no symlink hacks.

```
~/palette/
  api-redesign/
    backend/          ← worktree of ~/code/backend on feature/api-v2
    frontend/         ← worktree of ~/code/frontend on feature/api-v2
    api-redesign.code-workspace
    .palette.yaml

  bug-fix-sprint/
    backend/          ← worktree of ~/code/backend on fix/auth-regression
    infra/            ← worktree of ~/code/infra on main
    bug-fix-sprint.code-workspace
    .palette.yaml
```

Both projects are live simultaneously. `backend` is checked out at two different branches at once — each project has its own isolated copy. Switch projects by opening a different directory.

Because each project is just a directory, every tool works natively:

- **Cursor / VS Code** — open the generated `.code-workspace` file
- **Claude Code** — `cd ~/palette/api-redesign && claude`
- **OpenCode / any terminal tool** — same, just `cd` in
- **Finder / file explorer** — browse repos as normal directories

### AI agent support

palette ships an `AGENTS.md` file that tells AI coding agents (Claude Code, Cursor, OpenCode, etc.) how to orient themselves inside a palette project. Copy it into your agent's global instructions file so it's always available:

```bash
# Claude Code
cat $(npm root -g)/palette-wm/AGENTS.md >> ~/.claude/CLAUDE.md

# Cursor
cat $(npm root -g)/palette-wm/AGENTS.md >> ~/.cursor/rules
```

Or paste the contents manually into whichever instructions file your agent reads.

## Install

```bash
npm install -g palette-wm
```

Or with Bun:

```bash
bun install -g palette-wm
```

**Requirements:** git 2.5+ (for worktree support), Node 18+ or Bun.

## Usage

### Create a project

```bash
palette init api-redesign
```

### Add repos to a project

```bash
# Defaults to a branch named after the project (creates it if it doesn't exist)
palette add api-redesign ~/code/backend

# Specify a custom branch
palette add api-redesign ~/code/frontend --branch feature/api-v2

# Override the name used inside the project directory
palette add api-redesign ~/code/some-long-repo-name --name infra
```

The repo must have an `origin` remote configured. palette stores the remote URL in the project config so the project can be exported and recreated elsewhere.

### Open a project

```bash
# Auto-detects cursor, code, or zed
palette open api-redesign

# Specify your editor
palette open api-redesign --editor cursor
palette open api-redesign --editor code
```

### Check status across all repos

```bash
# One project
palette status api-redesign

# All projects
palette status
```

Output shows branch, dirty state, and ahead/behind:

```
  backend                  feature/api-v2 *  ↑2 ↓0
  frontend                 feature/api-v2
```

### Sync (pull) all repos

```bash
palette sync api-redesign   # one project
palette sync                # all projects
```

### Save current branch state to config

When you've switched branches inside a project and want the config to reflect that:

```bash
palette save api-redesign
```

### Remove a repo from a project

```bash
palette remove api-redesign frontend

# If there are uncommitted changes
palette remove api-redesign frontend --force
```

### Delete a project

Removes all worktrees and the project directory. The original repos are untouched.

```bash
palette delete api-redesign
palette delete api-redesign --force  # ignore uncommitted changes
```

### List all projects

```bash
palette list
```

---

## Sharing projects

### Export a project as a portable template

Generates a `.palette.yaml` template with git remote URLs instead of local paths, so anyone can recreate the project on their own machine:

```bash
palette export api-redesign
# writes ./api-redesign.palette.yaml

palette export api-redesign ~/shared/api-redesign.palette.yaml
```

The exported file looks like:

```yaml
name: api-redesign
repos:
  backend:
    origin: https://github.com/org/backend.git
    branch: feature/api-v2
  frontend:
    origin: https://github.com/org/frontend.git
    branch: feature/api-v2
```

### Create a project from a template

Recreates a project from an exported (or hand-written) template file. Repos are cloned into your configured `base-dir` (required — set it with `palette config set base-dir <path>` or pass `--base-dir` for a one-off override). If a repo with a matching remote URL already exists in `base-dir`, it's reused instead of re-cloned.

```bash
palette from api-redesign.palette.yaml

# Override the project name
palette from api-redesign.palette.yaml --name my-api-work

# Override base directory for this run only
palette from api-redesign.palette.yaml --base-dir ~/code
```

---

## Configuration

### Global settings

```bash
# Set the default directory where repos are looked up or cloned when using `palette from`
# Also creates a symlink at <base-dir>/palette pointing to the palette data folder
palette config set base-dir ~/code

# Copy files matching a pattern into each new worktree (run multiple times to add more)
# Applies to both `palette add` and `palette from`
palette config set copy .env
palette config set copy .env.local

# Remove a copy pattern
palette config unset copy .env.local

# Automatically run the package manager install after creating a worktree
# Detects: bun (bun.lockb) > pnpm (pnpm-lock.yaml) > yarn (yarn.lock) > npm
palette config set install true

# View current settings
palette config
```

Settings are stored at `~/palette/.settings.yaml`.

Copy patterns are matched against files in the **top-level** of the origin repo directory. Glob-style wildcards are supported (e.g. `.env*`, `*.local`). Files are only copied if they don't already exist in the worktree.

### Project config

Each project has a `.palette.yaml` inside its directory:

```yaml
name: api-redesign
repos:
  backend:
    origin: /Users/you/code/backend
    branch: feature/api-v2
  frontend:
    origin: /Users/you/code/frontend
    branch: feature/api-v2
```

You can edit this file directly if needed — palette reads it on every command.

### Custom home directory

By default palette stores projects in `~/palette`. Override with an environment variable:

```bash
export PALETTE_HOME=~/projects
```

---

## How worktrees work

Git worktrees let you check out multiple branches of the same repo simultaneously into different directories. They share the same `.git` object store, so they're space-efficient and all branches/commits are visible from any worktree. The only constraint: two worktrees can't check out the *same* branch at the same time — different projects on different branches work fine.

When you run `palette add`, it runs `git worktree add` under the hood. When you run `palette remove` or `palette delete`, it runs `git worktree remove`, which cleanly deregisters the worktree from git's tracking.

## Editor workspace files

Every project directory contains a `<name>.code-workspace` file that lists all repos as workspace folders. This is regenerated automatically whenever you add or remove a repo. Open it in Cursor or VS Code to get a multi-root workspace with exactly the repos for that project — no manual configuration.
