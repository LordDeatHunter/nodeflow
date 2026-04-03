## Learnings

- Bun workspaces can replace the previous pnpm prefix scripts cleanly with `bun --cwd ... run ...`.
- Turborepo needs a root `packageManager` field to resolve workspaces in this repo.
