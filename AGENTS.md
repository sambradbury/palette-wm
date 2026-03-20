# palette

This project uses **palette** to manage multi-repo workspaces via git worktrees. Each project is a directory containing worktrees of multiple repos, all checked out simultaneously on their own branches.

## Project layout

```
~/palette/<project-name>/
  <repo-a>/        ← git worktree of some repo on a feature branch
  <repo-b>/        ← git worktree of another repo on the same branch
  .palette.yaml    ← project config (repos + branches)
  <project>.code-workspace
```

When you are inside a project directory, each subdirectory is a fully independent git repo. Run git commands directly inside them.

## Useful commands during normal work

```bash
# Check branch, dirty state, and ahead/behind across all repos in a project
palette status <project>

# Pull latest changes in all repos
palette sync <project>

# After manually switching branches inside the project, persist the new branches to config
palette save <project>
```

## Project management

```bash
palette list                        # list all projects
palette init <name>                 # create a new project
palette add <project> <repo-path>   # add a repo as a worktree (repo needs an origin remote)
palette remove <project> <repo>     # remove a repo's worktree from the project
palette delete <project>            # delete a project and all its worktrees
```

## Sharing projects

```bash
palette export <project>            # export to a .palette.yaml template with remote URLs
palette from <template.yaml>        # recreate a project from a template (clones repos into base-dir)
```
