## Learnings

- Vanilla scaffolds can stay framework-agnostic while still using DOM libs and a pure Vite library build.
- `vite-plugin-dts` works cleanly with an empty barrel export for generating package type declarations.
- `@nodeflow/core` remains a peer dependency only; no adapter logic was added in this scaffold.
