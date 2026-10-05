# AGENTS.md

TypeScript library for flowcharts/graphs/diagrams, now a framework-agnostic monorepo of adapters (Bun workspaces + Turborepo).

> **Docs are stale.** `README.md` and the npm page still describe the old pre-rewrite `nodeflow-lib` API (`NodeflowLib.get().createCanvas(...)`) and claim SolidJS-only. The real API lives in `packages/*/src/index.ts` (`createSolidNodeflow`, `createVanillaNodeflow`, `Nodeflow` components + `createNodeDisplay`). Trust code, not README.

## Package graph

- `@nodeflow-lib/core` (`packages/core`) — framework-agnostic state/logic. Zero framework/DOM deps. Owns CSS.
- `@nodeflow-lib/solid` (`packages/solid`) — SolidJS adapter. Depends on **core**.
- `@nodeflow-lib/vanilla` (`packages/vanilla`) — plain-DOM adapter. Depends on **core**.
- `@nodeflow-lib/react`, `@nodeflow-lib/vue`, `@nodeflow-lib/svelte` — thin wrappers depending on **`@nodeflow-lib/vanilla`** (not core) and re-exporting it.
- `examples/*` — one app per adapter plus Solid examples (`BlueprintApp`, `FamilyTreeApp`, `NoStyle`).
- Solid/vanilla entrypoints re-export core (`export * from "@nodeflow-lib/core"`), so consumers get core types through the adapter they import.

## Commands (from repo root)

- Install: `bun install`. Package manager is `bun@1.3.11` (`bun.lock`). Some example dirs contain stale `pnpm-lock.yaml` files — ignore them.
- Build all packages: `bunx turbo build`. **There is no root `build` script.**
- Test: `bun run test` (`bunx turbo test`) — vitest, `packages/core` only.
- Typecheck: `bun run typecheck` (`turbo typecheck`) — per-package `tsc --noEmit`.
- Lint: `bun run lint` — root ESLint flat config; ignores `scripts/`, `dist/`, `examples-build/`.
- Run one test: from `packages/core`: `bunx vitest run tests/NodeflowData.test.ts` (add `-t "name"` to filter).
- Build one example: `bun --cwd=examples/ReactApp run build`.
- Deploy examples: `bun run deploy-examples` (builds to `examples-build/`, publishes via `gh-pages`).

### Dev servers

`bun run dev` / `bun run start` runs `run-p "dev:*"`, i.e. **everything at once**: landing `:3000`, Blueprint `:3001`, FamilyTree `:3002`, NoStyle `:3003`, Vanilla `:3004`, React `:3005`, Svelte `:3006`, Vue `:3007`. For a single app use `bun run dev:react` (etc.). Ports are hardcoded in each `examples/*/vite.config.ts`; a new example needs a unique port plus a new `dev:<name>` root script.

## Critical gotchas

- **Examples consume built `dist/`, not package `src`.** There are no Vite aliases; `@nodeflow-lib/*` resolve through package.json `module`/`exports` → `dist/`. After editing any package, re-run `bunx turbo build` before testing an example, or you will test stale code.
- `turbo.json` makes `test` and `typecheck` depend on `^build` (deps rebuild first); `dev` does **not**.
- Tests must live under `packages/core/tests/**/*.test.ts` — vitest `include` is scoped to `tests/`, and `packages/core/tsconfig.json` excludes `tests`.
- CSS is authored in `packages/core/src/style.css` and copied to `dist/style.css` by a custom Vite plugin. Consumers import `@nodeflow-lib/core/style.css`. Never edit `dist/`.
- No CI workflows and no committed Prettier config (prettier is only a dependency). Lint is the enforced gate.

## Core architecture (`packages/core/src`)

- Class-based state: `NodeflowData` (root, ~1400 lines), `NodeflowNodeData`, `ConnectorSection`, `NodeConnector`, `SelectionMap`, `SelectionBoxData`, `MouseData`, `KeyboardData`, `Changes` (undo/redo), `NodeflowChunking` (spatial hashing).
- `NodeflowRegistry` is a singleton; its `createCanvas` builds a `NodeflowData`. Adapters wire global `document` mouse/pointer handlers into `globalEventStore`. Global-event wiring belongs in adapters, not core.
- Keep core free of SolidJS and DOM APIs — adapters own rendering and DOM events.
- **Custom data typing**: `CustomNodeflowDataType` is an empty global interface declared in `packages/core/src/index.ts`. Apps extend it via `declare global` in a `types.d.ts` referenced by package.json `"types"` (see `examples/FamilyTreeApp/src/types.d.ts`). Note `BlueprintApp`/`NoStyle` still point `"types"` at a `src/types.d.ts` that does not exist.

## Repo conventions

- ESLint rules that differ from defaults: semicolons **always**; `arrow-body-style: as-needed` (no braces for simple returns); `object-shorthand` required; `prefer-const`; `no-duplicate-imports`; `yoda: never`; unused vars/args must be `_`-prefixed.
- `.sisyphus/`, `.turbo/`, `.bp-*.txt`, `.ft-*.txt`, and `playwright-qa.mjs` are gitignored local agent/QA outputs — do not commit them or treat them as project source.
