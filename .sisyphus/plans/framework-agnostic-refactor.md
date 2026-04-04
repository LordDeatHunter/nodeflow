# Framework-Agnostic Refactor — nodeflow-lib → @nodeflow/\*

## TL;DR

> **Quick Summary**: Refactor nodeflow-lib from a SolidJS-coupled monolith into a framework-agnostic monorepo with separate packages: `@nodeflow/core` (pure TS, zero framework deps), `@nodeflow/solid` (SolidJS adapter), and `@nodeflow/vanilla` (plain DOM adapter). SolidJS reactivity (createStore, ReactiveMap) is deeply embedded in 10+ core model files and must be replaced with plain objects + EventEmitter.
>
> **Deliverables**:
>
> - `@nodeflow/core` — framework-agnostic core with zero Solid/DOM dependencies
> - `@nodeflow/solid` — SolidJS adapter preserving all current functionality
> - `@nodeflow/vanilla` — plain DOM adapter proving framework independence
> - Test suite covering all core model behaviors (bun test)
> - Existing example apps (BlueprintApp, FamilyTreeApp, NoStyle) working with @nodeflow/solid
> - New vanilla JS example app
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 6 waves
> **Critical Path**: Monorepo scaffold → Test infra → Behavioral tests → Model refactoring (simplest→hardest) → Core API extraction → Adapters → Examples

---

## Context

### Original Request

Refactor the entire nodeflow-lib project so that it can support any frontend framework, instead of just SolidJS.

### Interview Summary

**Key Discussions**:

- **Package structure**: Monorepo with @nodeflow/\* scoped packages (core, solid, vanilla for Phase 1; react, vue, svelte for Phase 2)
- **State strategy**: Replace Solid's createStore/ReactiveMap with plain JS objects + EventEmitter — clean break, no reactivity shims
- **DisplayFunc**: Generic type parameter `DisplayFunc<T>` — core uses `DisplayFunc<unknown>`, adapters specialize
- **DOM events**: Adapters handle DOM events and call core API methods — core has zero DOM API calls
- **Testing**: TDD approach — write behavioral tests BEFORE refactoring each model file
- **Monorepo tooling**: Bun workspaces + Turborepo (fallback to just Bun if compatibility issues)
- **CSS**: Core owns the CSS file, adapters import it
- **Backward compat**: Breaking changes OK — this is a new major version
- **Examples**: Keep existing SolidJS examples working, add a vanilla JS example
- **Phase scope**: Phase 1 = core + solid + vanilla. Phase 2 (separate future plan) = react, vue, svelte

**Research Findings**:

- SolidJS coupling is DEEP — reactivity is the core state mechanism across 10 model files, not just UI binding
- 10 model files use createStore/ReactiveMap (not 8 as initially counted — SelectionMap and NodeflowChunking were missed)
- Components sometimes write back to model (NodeCurve → path, NodeflowNode → size/offset, Connector → position, Canvas → measurements)
- `NodeflowLib` singleton attaches global `document` event handlers — must move to adapter layer
- `screen-utils.ts` exports a Solid signal (`windowSize`) — cannot live in core
- Model types contain DOM references (`ref?: HTMLDivElement`, `resizeObserver?: ResizeObserver`) — must be removed from core
- `solid-styled-components` listed as peerDependency — possibly unused in library source (needs verification)
- Framework-agnostic files already exist: Vec2, Rect, CurveFunctions, ArrayWrapper, Changes, constants
- No test infrastructure exists — zero tests, no test framework, no CI
- Prior art: Rete.js (modular/plugin), Drawflow (vanilla), litegraph.js (performance)

### Metis Review

**Identified Gaps** (addressed):

- **SelectionMap.ts** and **NodeflowChunking.ts** missing from refactor list — added (both use ReactiveMap/createStore)
- **screen-utils.ts** (`windowSize` signal) needs migration — moved to @nodeflow/solid or replaced
- **NodeflowLib document-level events** — split into NodeflowRegistry (core) + adapter initialization
- **DOM references in model types** (`ref`, `resizeObserver`) — removed from core, adapters manage DOM refs
- **Component-to-model writes** — extracted into explicit core API methods
- **`solid-styled-components` peerDep** — verify usage, likely stale
- **`produce` deep mutation semantics** — replaced with direct mutation (plain objects don't need immer-like patterns)
- **Collision `createEffect`** — converted to imperative `checkCollisions()` called after position updates
- **Bun + Turborepo compatibility** — test before committing, have fallback plan

---

## Work Objectives

### Core Objective

Transform nodeflow-lib from a SolidJS-coupled monolith into a framework-agnostic monorepo where the core library has zero framework dependencies, enabling adapters for any frontend framework.

### Concrete Deliverables

- `packages/core/` — @nodeflow/core (pure TypeScript, zero framework deps, exports CSS)
- `packages/solid/` — @nodeflow/solid (SolidJS adapter with all current rendering components)
- `packages/vanilla/` — @nodeflow/vanilla (plain DOM adapter)
- `packages/core/tests/` — behavioral test suite for all model classes
- `examples/BlueprintApp/` — migrated to @nodeflow/solid (working)
- `examples/FamilyTreeApp/` — migrated to @nodeflow/solid (working)
- `examples/NoStyle/` — migrated to @nodeflow/solid (working)
- `examples/VanillaApp/` — new vanilla JS example

### Definition of Done

- [ ] `bun test` passes across all packages with 0 failures
- [ ] `bun run build` succeeds for core, solid, vanilla packages
- [ ] `bun run typecheck` passes across all packages with 0 errors
- [ ] `@nodeflow/core` has ZERO imports from solid-js, solid-js/store, solid-js/web, @solid-primitives/\*
- [ ] `@nodeflow/core` has ZERO direct DOM API calls (document._, window._, ResizeObserver)
- [ ] All 3 existing example apps build and run with @nodeflow/solid
- [ ] Vanilla JS example app builds and runs with @nodeflow/vanilla
- [ ] Nodes render, can be dragged, connections display in at least one example (Playwright smoke test)

### Must Have

- Core package with zero framework dependencies
- All current features preserved: zoom, pan, drag, select, connect, undo/redo, custom curves, custom node content
- SolidJS adapter that provides equivalent functionality to current library
- Vanilla JS adapter proving framework independence
- Behavioral tests for all model classes
- Generic `DisplayFunc<T>` replacing `JSX.Element`-coupled `DisplayFunc`
- Explicit core API methods for DOM measurement updates (replacing component-to-model writes)
- EventEmitter-based change notification for adapters

### Must NOT Have (Guardrails)

- **No reactivity shim** — Do NOT create a custom reactive system that mimics createStore's `[state, setState]` tuple. Use plain class properties with getters/setters.
- **No business logic refactoring** — ONLY replace Solid-specific patterns in model files. Do NOT reorganize, split, or restructure the business logic in NodeflowData.ts (1506 lines).
- **No plugin architecture** — Do NOT add a plugin system (despite Rete.js prior art). This is framework decoupling, not architectural enhancement.
- **No CSS redesign** — Extract existing style.css as-is. Do NOT introduce CSS modules, CSS-in-JS, Tailwind, or any new styling approach.
- **No serialization redesign** — The DisplayFunc serialization TODO is pre-existing. Do NOT attempt to solve it.
- **No React/Vue/Svelte adapters** — Phase 2 work. Not in this plan.
- **No event system redesign** — Replace ReactiveMap with Map in EventPublishers, but preserve the event naming, subscription model, priority/blacklist features.
- **No CI/CD pipeline** — Out of scope for this refactor.
- **No npm publishing** — Out of scope.
- **No `Changes.ts` refactoring** — Already framework-agnostic. Don't touch unless it imports Solid.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision

- **Infrastructure exists**: NO (must be created)
- **Automated tests**: TDD — write tests BEFORE refactoring each model file
- **Framework**: bun test (built-in to Bun)
- **Each model refactor task**: Write behavioral tests → verify current behavior → refactor → verify tests still pass

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Core model tests**: Use Bash (bun test) — run test suite, assert 0 failures
- **Build verification**: Use Bash (bun run build) — verify 0 errors
- **Type checking**: Use Bash (bun run typecheck) — verify 0 errors
- **Framework isolation**: Use Bash (grep) — verify no Solid imports in core output
- **Example apps**: Use Playwright — render canvas, verify nodes display, test drag interaction
- **Vanilla adapter**: Use Playwright — verify plain DOM rendering works

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, no code changes):
├── Task 1: Monorepo scaffold (bun workspaces + turbo) [quick]
├── Task 2: @nodeflow/core package scaffold [quick]
├── Task 3: @nodeflow/solid package scaffold [quick]
├── Task 4: @nodeflow/vanilla package scaffold [quick]
└── Task 5: Test infrastructure setup (bun test config) [quick]

Wave 2 (After Wave 1 — behavioral tests, MAX PARALLEL):
├── Task 6: Tests for NodeflowData (node/connection CRUD, serialize, zoom, pan) [deep]
├── Task 7: Tests for NodeflowNodeData (create, connectors, collision, serialize) [deep]
├── Task 8: Tests for NodeConnector + ConnectorSection (CRUD, geometry) [unspecified-high]
├── Task 9: Tests for MouseData + KeyboardData + SelectionBoxData [unspecified-high]
├── Task 10: Tests for EventPublishers (subscribe, publish, priority, blacklist) [unspecified-high]
├── Task 11: Tests for SelectionMap + NodeflowChunking [unspecified-high]
└── Task 12: Tests for Changes (undo/redo behavioral tests) [unspecified-high]

Wave 3 (After Wave 2 — core extraction + type refactoring):
├── Task 13: Move framework-agnostic files to core (Vec2, Rect, CurveFunctions, etc.) [quick]
├── Task 14: Refactor types — make DisplayFunc generic, remove JSX/ReactiveMap from core types [deep]
├── Task 15: Refactor EventPublishers — replace ReactiveMap with Map [unspecified-high]
├── Task 16: Refactor KeyboardData — remove createStore + produce [unspecified-high]
├── Task 17: Refactor SelectionBoxData — remove createStore [unspecified-high]
├── Task 18: Refactor MouseData — remove createStore [unspecified-high]
└── Task 19: Refactor SelectionMap — replace 3 ReactiveMap with Map [unspecified-high]

Wave 4 (After Wave 3 — harder model refactoring):
├── Task 20: Refactor NodeflowChunking — remove createStore + ReactiveMap [unspecified-high]
├── Task 21: Refactor NodeConnector — remove createStore [unspecified-high]
├── Task 22: Refactor ConnectorSection — remove createStore + ReactiveMap [unspecified-high]
├── Task 23: Refactor NodeflowNodeData — remove createStore + createEffect (collision) [deep]
└── Task 24: Refactor NodeflowData — remove createStore ×2, ReactiveMap, produce [deep]

Wave 5 (After Wave 4 — core API + adapters):
├── Task 25: Extract core measurement API + move component-to-model writes [deep]
├── Task 26: Split NodeflowLib into NodeflowRegistry (core) + adapter init [deep]
├── Task 27: Move screen-utils.ts to @nodeflow/solid (or replace) [quick]
├── Task 28: Move CSS to @nodeflow/core dist output [quick]
├── Task 29: Implement @nodeflow/solid adapter (move .tsx components, bridge state) [deep]
└── Task 30: Implement @nodeflow/vanilla adapter (plain DOM rendering) [deep]

Wave 6 (After Wave 5 — examples + cleanup):
├── Task 31: Migrate existing example apps to @nodeflow/solid [unspecified-high]
├── Task 32: Create vanilla JS example app [unspecified-high]
├── Task 33: Core isolation verification (zero framework imports check) [quick]
├── Task 34: Remove old single-package structure + cleanup [quick]
└── Task 35: Verify solid-styled-components usage + remove if stale [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1→T5→T6→T14→T24→T26→T29→T31→F1-F4→user okay
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Wave 2)
```

### Dependency Matrix

| Task  | Depends On     | Blocks                               |
| ----- | -------------- | ------------------------------------ |
| 1     | —              | 2, 3, 4, 5                           |
| 2     | 1              | 13, 14, 15, 16-19                    |
| 3     | 1              | 29                                   |
| 4     | 1              | 30                                   |
| 5     | 1              | 6-12                                 |
| 6     | 5              | 24                                   |
| 7     | 5              | 23                                   |
| 8     | 5              | 21, 22                               |
| 9     | 5              | 16, 17, 18                           |
| 10    | 5              | 15                                   |
| 11    | 5              | 19, 20                               |
| 12    | 5              | (none — Changes is already agnostic) |
| 13    | 2              | 14                                   |
| 14    | 13             | 16-24                                |
| 15    | 10, 2          | 25, 26                               |
| 16    | 9, 14          | 18                                   |
| 17    | 9, 14          | 18                                   |
| 18    | 9, 14, 16, 17  | 24                                   |
| 19    | 11, 14         | 20                                   |
| 20    | 19             | 23                                   |
| 21    | 8, 14          | 22                                   |
| 22    | 21             | 23                                   |
| 23    | 7, 20, 22      | 24                                   |
| 24    | 6, 18, 23      | 25, 26                               |
| 25    | 24             | 29, 30                               |
| 26    | 24, 15         | 29, 30                               |
| 27    | 3              | 29                                   |
| 28    | 2              | 29, 30                               |
| 29    | 25, 26, 27, 28 | 31                                   |
| 30    | 25, 26, 28     | 32                                   |
| 31    | 29             | F1-F4                                |
| 32    | 30             | F1-F4                                |
| 33    | 24             | F1-F4                                |
| 34    | 31, 32, 33     | F1-F4                                |
| 35    | 1              | 34                                   |
| F1-F4 | 31-35          | user okay                            |

### Agent Dispatch Summary

- **Wave 1**: **5** — T1-T5 → `quick`
- **Wave 2**: **7** — T6-T7 → `deep`, T8-T12 → `unspecified-high`
- **Wave 3**: **7** — T13 → `quick`, T14 → `deep`, T15-T19 → `unspecified-high`
- **Wave 4**: **5** — T20-T22 → `unspecified-high`, T23-T24 → `deep`
- **Wave 5**: **6** — T25-T26 → `deep`, T27-T28 → `quick`, T29-T30 → `deep`
- **Wave 6**: **5** — T31-T32 → `unspecified-high`, T33-T35 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Monorepo Scaffold — Bun Workspaces + Turborepo

  **What to do**:

  - Initialize Bun workspaces in root `package.json` with `"workspaces": ["packages/*", "examples/*"]`
  - Add Turborepo config (`turbo.json`) with `build`, `test`, `typecheck` pipelines
  - Test that `bun install` works at root level and cross-package dependencies resolve
  - If Turborepo has compatibility issues with Bun (known issues #12156, #26973), fall back to plain Bun workspaces without Turborepo
  - Remove pnpm-lock.yaml, generate bun.lock
  - Update root `package.json` scripts for monorepo commands

  **Must NOT do**:

  - Do NOT move any source files yet
  - Do NOT change any existing code
  - Do NOT add CI/CD configuration

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:

  - `package.json` — current project config, dependencies, scripts (see peerDependencies for solid-js, devDependencies for vite-plugin-solid)
  - `pnpm-lock.yaml` — current lock file to be replaced with bun.lock

  **External References**:

  - Bun workspaces docs: https://bun.sh/docs/install/workspaces
  - Turborepo + Bun docs: https://turbo.build/repo/docs/getting-started/installation

  **WHY Each Reference Matters**:

  - `package.json` — need to understand current dependency structure to properly configure workspaces
  - Lock file — must switch from pnpm to bun package management

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Bun workspaces resolve correctly
    Tool: Bash
    Preconditions: Root package.json configured with workspaces
    Steps:
      1. Run `bun install` at repo root
      2. Verify bun.lock is generated
      3. Verify node_modules exists at root
    Expected Result: `bun install` exits with code 0, bun.lock exists
    Failure Indicators: bun install fails, workspaces not detected
    Evidence: .sisyphus/evidence/task-1-workspace-install.txt

  Scenario: Turborepo pipeline works (or fallback)
    Tool: Bash
    Preconditions: turbo.json exists with build pipeline
    Steps:
      1. Run `bunx turbo build --dry-run` (or `bun run build` if turbo not used)
      2. Verify pipeline graph is correct
    Expected Result: Turbo recognizes all packages and their dependencies, or plain bun scripts work
    Failure Indicators: turbo fails to resolve packages
    Evidence: .sisyphus/evidence/task-1-turbo-pipeline.txt
  ```

  **Commit**: YES

  - Message: `chore: initialize monorepo with bun workspaces`
  - Files: `package.json`, `turbo.json`, `bun.lock`
  - Pre-commit: `bun install`

- [x] 2. @nodeflow/core Package Scaffold

  **What to do**:

  - Create `packages/core/package.json` with name `@nodeflow/core`, no framework dependencies
  - Create `packages/core/tsconfig.json` — NO `jsxImportSource`, NO solid-js in types
  - Create `packages/core/src/index.ts` as empty barrel export
  - Configure build script (vite or tsup for pure TS library output)

  **Must NOT do**:

  - Do NOT move source files yet
  - Do NOT add any framework-specific dependencies

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 13, 14, 15, 16-19, 28
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:

  - `package.json` — current package config to base the new package on (name, version, main/module/types fields, build scripts)
  - `tsconfig.json` — current TS config; the core version must REMOVE jsxImportSource and solid-js types
  - `vite.config.ts` — current build config; core needs a simpler version without vite-plugin-solid

  **WHY Each Reference Matters**:

  - Need to replicate the library output format (ESM + CJS + types) without Solid-specific config
  - tsconfig must be explicitly different from root — no JSX, no solid-js

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Core package builds with zero errors
    Tool: Bash
    Preconditions: packages/core scaffold exists
    Steps:
      1. Run `bun run build` in packages/core/
      2. Verify dist/ output contains .js and .d.ts files
    Expected Result: Build exits 0, dist/ has output files
    Failure Indicators: Build errors, missing output
    Evidence: .sisyphus/evidence/task-2-core-build.txt

  Scenario: Core tsconfig has no Solid references
    Tool: Bash
    Preconditions: packages/core/tsconfig.json exists
    Steps:
      1. Search packages/core/tsconfig.json for "solid"
      2. Assert 0 matches
    Expected Result: No Solid references in tsconfig
    Failure Indicators: "solid" found in tsconfig
    Evidence: .sisyphus/evidence/task-2-no-solid-tsconfig.txt
  ```

  **Commit**: YES

  - Message: `chore: create @nodeflow/core package scaffold`
  - Files: `packages/core/*`
  - Pre-commit: `bun run build --filter @nodeflow/core`

- [x] 3. @nodeflow/solid Package Scaffold

  **What to do**:

  - Create `packages/solid/package.json` with name `@nodeflow/solid`, peerDependency on `solid-js` and `@nodeflow/core`
  - Create `packages/solid/tsconfig.json` WITH `jsxImportSource: "solid-js"`, solid-js types
  - Create `packages/solid/src/index.ts` as empty barrel export
  - Configure build (vite + vite-plugin-solid, similar to current vite.config.ts)

  **Must NOT do**:

  - Do NOT move component files yet

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 27, 29
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:

  - `package.json` — current peerDependencies (solid-js ^1.9.3, solid-styled-components ^0.28.5)
  - `tsconfig.json` — current Solid-specific TS config to replicate for this adapter
  - `vite.config.ts` — current vite-plugin-solid config to replicate

  **WHY Each Reference Matters**:

  - Solid adapter must preserve the exact same build configuration for .tsx components
  - peerDependencies must match what consumers expect

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Solid package scaffold builds
    Tool: Bash
    Preconditions: packages/solid scaffold exists
    Steps:
      1. Run `bun run build` in packages/solid/
      2. Verify dist/ output
    Expected Result: Build exits 0
    Failure Indicators: Build errors
    Evidence: .sisyphus/evidence/task-3-solid-build.txt
  ```

  **Commit**: YES

  - Message: `chore: create @nodeflow/solid package scaffold`
  - Files: `packages/solid/*`
  - Pre-commit: `bun run build --filter @nodeflow/solid`

- [x] 4. @nodeflow/vanilla Package Scaffold

  **What to do**:

  - Create `packages/vanilla/package.json` with name `@nodeflow/vanilla`, dependency on `@nodeflow/core`
  - Create `packages/vanilla/tsconfig.json` — no framework-specific config
  - Create `packages/vanilla/src/index.ts` as empty barrel export
  - Configure build (vite or tsup for pure TS library)

  **Must NOT do**:

  - Do NOT implement any adapter logic yet

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 30
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:

  - `packages/core/package.json` (from Task 2) — base structure to follow for vanilla package

  **WHY Each Reference Matters**:

  - Vanilla adapter should follow the same package structure as core

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Vanilla package scaffold builds
    Tool: Bash
    Preconditions: packages/vanilla scaffold exists
    Steps:
      1. Run `bun run build` in packages/vanilla/
      2. Verify dist/ output
    Expected Result: Build exits 0
    Failure Indicators: Build errors
    Evidence: .sisyphus/evidence/task-4-vanilla-build.txt
  ```

  **Commit**: YES

  - Message: `chore: create @nodeflow/vanilla package scaffold`
  - Files: `packages/vanilla/*`
  - Pre-commit: `bun run build --filter @nodeflow/vanilla`

- [x] 5. Test Infrastructure Setup

  **What to do**:

  - Configure `bun test` in root and packages/core
  - Create `packages/core/tests/` directory
  - Create a simple smoke test (e.g., `packages/core/tests/smoke.test.ts` that asserts `1 + 1 === 2`) to verify infrastructure works
  - Add `"test": "bun test"` script to root and core package.json
  - Configure test to run from monorepo root via turbo or bun

  **Must NOT do**:

  - Do NOT write actual behavioral tests yet (that's Wave 2)
  - Do NOT install jest, vitest, or other test frameworks — use bun's built-in test runner

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Tasks 6-12
  - **Blocked By**: Task 1

  **References**:

  **External References**:

  - Bun test runner docs: https://bun.sh/docs/cli/test

  **WHY Each Reference Matters**:

  - Bun's test runner has specific conventions (test file naming, assertion API) that must be followed

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Bun test runs and passes
    Tool: Bash
    Preconditions: Test infrastructure configured
    Steps:
      1. Run `bun test` at repo root
      2. Verify smoke test passes
    Expected Result: "1 pass, 0 fail" (or similar)
    Failure Indicators: Test runner not found, test fails
    Evidence: .sisyphus/evidence/task-5-test-infra.txt

  Scenario: Test runs from monorepo root
    Tool: Bash
    Preconditions: Turbo or bun scripts configured
    Steps:
      1. Run `bun run test` (or `bunx turbo test`) from repo root
      2. Verify it finds and runs tests in packages/core/
    Expected Result: Smoke test discovered and passes
    Failure Indicators: Tests not discovered cross-package
    Evidence: .sisyphus/evidence/task-5-monorepo-test.txt
  ```

  **Commit**: YES

  - Message: `chore: add bun test infrastructure`
  - Files: `packages/core/tests/smoke.test.ts`, package.json updates
  - Pre-commit: `bun test`

- [x] 6. Behavioral Tests for NodeflowData

  **What to do**:

  - Create `packages/core/tests/NodeflowData.test.ts`
  - Write tests covering the public API of NodeflowData:
    - Canvas creation with default and custom settings
    - `addNode()` — node appears in nodes map, correct position/id
    - `removeNode()` — node removed, connections involving it also removed
    - `addConnection()` — connection established between connectors
    - `removeConnection()` — connection removed cleanly
    - `updateZoom()` — zoomLevel changes within bounds
    - `transformVec2ToCanvas()` — coordinate transform is correct
    - `serialize()` / `deserialize()` — round-trip preserves all nodes, connections, positions
    - `updateSettings()` — settings applied
    - `getNextFreeNodeId()` — returns unique IDs
  - Tests run against the CURRENT Solid-based implementation (import from `../../src/utils/data/NodeflowData`)
  - Tests must verify synchronous state — do NOT test Solid reactive scheduling

  **Must NOT do**:

  - Do NOT modify NodeflowData.ts
  - Do NOT test Solid-specific behavior (reactive tracking, batching)

  **Recommended Agent Profile**:

  - **Category**: `deep`
  - **Skills**: []
    - Reason: Complex test authoring requiring deep understanding of a large class (1506 lines) and its public API surface

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-12)
  - **Blocks**: Task 24
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeflowData.ts` — the class to test; public methods: addNode, removeNode, addConnection, removeConnection, updateZoom, transformVec2ToCanvas, serialize, deserialize, updateSettings, getNextFreeNodeId, getAllSourceConnectors
  - `src/nodeflow-types/types.ts` — NodeflowDataType, NodeflowSettings, SerializedNodeflowData types defining the expected shapes
  - `examples/FamilyTreeApp/src/App.tsx` — real consumer usage showing how addNode/addConnection/serialize are called

  **WHY Each Reference Matters**:

  - NodeflowData.ts contains all method signatures and internal logic — tests must exercise the public API
  - types.ts defines the expected shapes for inputs/outputs
  - Example app shows realistic usage patterns to model tests after

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All NodeflowData tests pass
    Tool: Bash
    Preconditions: Test file exists at packages/core/tests/NodeflowData.test.ts
    Steps:
      1. Run `bun test packages/core/tests/NodeflowData.test.ts`
      2. Verify all test cases pass
    Expected Result: All tests pass (≥10 test cases covering CRUD, serialize, zoom, transform)
    Failure Indicators: Any test fails, fewer than 10 test cases
    Evidence: .sisyphus/evidence/task-6-nodeflowdata-tests.txt

  Scenario: Tests import from current source (not yet refactored)
    Tool: Bash
    Preconditions: Tests written
    Steps:
      1. Grep test file for import path — should reference src/utils/data/
      2. Run tests to confirm they work against Solid-based implementation
    Expected Result: Tests pass against current codebase
    Failure Indicators: Import errors, Solid-specific runtime issues in test environment
    Evidence: .sisyphus/evidence/task-6-import-validation.txt
  ```

  **Commit**: YES

  - Message: `test(core): add NodeflowData behavioral tests`
  - Files: `packages/core/tests/NodeflowData.test.ts`
  - Pre-commit: `bun test`

- [x] 7. Behavioral Tests for NodeflowNodeData

  **What to do**:

  - Create `packages/core/tests/NodeflowNodeData.test.ts`
  - Write tests covering:
    - Node creation with position, size, CSS, custom data
    - `addConnectorSection()` / `removeConnectorSection()` — section CRUD
    - `addConnector()` via sections — connector appears in section
    - `getConnector()` — finds connector by ID across sections
    - `serialize()` / `deserialize()` — round-trip preserves all data
    - `select()` / deselect — selection state changes
    - `getCenter()` — correct center calculation from position + size
    - `update()` — updates size, offset, position
    - Collision behavior — verify overlapping nodes get adjusted positions

  **Must NOT do**:

  - Do NOT modify NodeflowNodeData.ts
  - Do NOT test the internal createEffect directly

  **Recommended Agent Profile**:

  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8-12)
  - **Blocks**: Task 23
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeflowNodeData.ts` — class under test; key methods: addConnectorSection, getConnector, serialize, update, select, getCenter
  - `src/nodeflow-types/types.ts` — NodeflowNodeType, SerializedNodeflowNode, ConnectorSectionType
  - `src/utils/data/ConnectorSection.ts` — ConnectorSection class used by NodeflowNodeData

  **WHY Each Reference Matters**:

  - NodeflowNodeData.ts contains all method signatures and the createEffect collision logic
  - ConnectorSection.ts is a dependency — tests may need to verify section behavior too

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All NodeflowNodeData tests pass
    Tool: Bash
    Preconditions: Test file exists
    Steps:
      1. Run `bun test packages/core/tests/NodeflowNodeData.test.ts`
      2. Verify all tests pass
    Expected Result: All tests pass (≥8 test cases covering CRUD, serialize, collision)
    Failure Indicators: Any test fails
    Evidence: .sisyphus/evidence/task-7-nodedata-tests.txt
  ```

  **Commit**: YES

  - Message: `test(core): add NodeflowNodeData behavioral tests`
  - Files: `packages/core/tests/NodeflowNodeData.test.ts`
  - Pre-commit: `bun test`

- [x] 8. Behavioral Tests for NodeConnector + ConnectorSection

  **What to do**:

  - Create `packages/core/tests/NodeConnector.test.ts` and `packages/core/tests/ConnectorSection.test.ts`
  - NodeConnector tests:
    - Creation with ID, connector section reference
    - Adding/removing destinations and sources
    - Position and size getters/setters
    - `serialize()` round-trip
  - ConnectorSection tests:
    - Creation with ID, node reference
    - `addConnector()` / removing connectors
    - Connector lookup by ID
    - `serialize()` round-trip

  **Must NOT do**:

  - Do NOT modify source files

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9-12)
  - **Blocks**: Tasks 21, 22
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeConnector.ts` — NodeConnector class; methods: destinations getter, sources getter, position, size, serialize
  - `src/utils/data/ConnectorSection.ts` — ConnectorSection class; methods: addConnector, connectors getter, serialize
  - `src/utils/data/ConnectorDestination.ts` — destination data model
  - `src/utils/data/ConnectorSource.ts` — source data model

  **WHY Each Reference Matters**:

  - These files contain the public APIs that tests must exercise
  - Destination/Source models are data dependencies that must be understood

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Connector tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/NodeConnector.test.ts packages/core/tests/ConnectorSection.test.ts`
    Expected Result: All tests pass (≥6 test cases per file)
    Evidence: .sisyphus/evidence/task-8-connector-tests.txt
  ```

  **Commit**: YES

  - Message: `test(core): add NodeConnector and ConnectorSection behavioral tests`
  - Files: `packages/core/tests/NodeConnector.test.ts`, `packages/core/tests/ConnectorSection.test.ts`
  - Pre-commit: `bun test`

- [x] 9. Behavioral Tests for MouseData + KeyboardData + SelectionBoxData

  **What to do**:

  - Create test files for each:
    - `packages/core/tests/MouseData.test.ts` — mouse position tracking, click state, held object state, selection state
    - `packages/core/tests/KeyboardData.test.ts` — key held tracking, isActionHeld checks, key release
    - `packages/core/tests/SelectionBoxData.test.ts` — bounding box setting, selection computation
  - Test the public getters/setters and state transitions

  **Must NOT do**:

  - Do NOT modify source files
  - Do NOT test DOM event handling (that's adapter-level)

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-8, 10-12)
  - **Blocks**: Tasks 16, 17, 18
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/MouseData.ts` — MouseData class; store-backed mouse/selection state
  - `src/utils/data/KeyboardData.ts` — KeyboardData class; store-backed keyboard state with produce
  - `src/utils/data/SelectionBoxData.ts` — SelectionBoxData class; store-backed bounding box + selection logic

  **WHY Each Reference Matters**:

  - Each file's public API must be tested to serve as regression safety net during refactoring

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Input data model tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/MouseData.test.ts packages/core/tests/KeyboardData.test.ts packages/core/tests/SelectionBoxData.test.ts`
    Expected Result: All tests pass (≥5 test cases per file)
    Evidence: .sisyphus/evidence/task-9-input-tests.txt
  ```

  **Commit**: YES

  - Message: `test(core): add MouseData, KeyboardData, SelectionBoxData behavioral tests`
  - Files: `packages/core/tests/MouseData.test.ts`, `packages/core/tests/KeyboardData.test.ts`, `packages/core/tests/SelectionBoxData.test.ts`
  - Pre-commit: `bun test`

- [x] 10. Behavioral Tests for EventPublishers

  **What to do**:

  - Create `packages/core/tests/EventPublishers.test.ts`
  - Test:
    - `subscribe()` — callback registered and called on publish
    - `publish()` — all subscribers notified with correct data
    - Priority ordering — higher priority subscribers called first
    - Blacklist filtering — blacklisted subscribers not called
    - `subscribeMultiple()` — multiple event subscriptions in one call
    - `unsubscribe()` — subscriber removed, no longer called
    - Edge cases: publish with no subscribers, subscribe same handler twice

  **Must NOT do**:

  - Do NOT modify EventPublishers.ts

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-9, 11-12)
  - **Blocks**: Task 15
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/EventPublishers.ts` — BaseEventPublisher and NodeflowEventPublisher classes; subscribe/publish/priority/blacklist API
  - `src/utils/data/NodeflowData.ts:setupDefaultEventHandlers()` — real-world usage showing how EventPublishers is configured (subscribe patterns, priority values, blacklist filters)

  **WHY Each Reference Matters**:

  - EventPublishers.ts defines the API surface to test
  - setupDefaultEventHandlers shows realistic usage patterns to model tests after

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: EventPublishers tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/EventPublishers.test.ts`
    Expected Result: All tests pass (≥7 test cases covering subscribe, publish, priority, blacklist, unsubscribe)
    Evidence: .sisyphus/evidence/task-10-eventpub-tests.txt
  ```

  **Commit**: YES

  - Message: `test(core): add EventPublishers behavioral tests`
  - Files: `packages/core/tests/EventPublishers.test.ts`
  - Pre-commit: `bun test`

- [x] 11. Behavioral Tests for SelectionMap + NodeflowChunking

  **What to do**:

  - Create `packages/core/tests/SelectionMap.test.ts`:
    - Adding/removing selections
    - Checking if item is selected
    - Clearing selections
    - Iterating selected items
  - Create `packages/core/tests/NodeflowChunking.test.ts`:
    - Adding nodes to chunks
    - Removing nodes from chunks
    - Querying nodes in a spatial region
    - Collision detection queries

  **Must NOT do**:

  - Do NOT modify source files

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10, 12)
  - **Blocks**: Tasks 19, 20
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/SelectionMap.ts` — SelectionMap class with 3 ReactiveMap instances
  - `src/utils/data/NodeflowChunking.ts` — spatial chunking with createStore + ReactiveMap

  **WHY Each Reference Matters**:

  - Both files use ReactiveMap heavily — tests must capture behavior before replacing with Map

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SelectionMap and Chunking tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/SelectionMap.test.ts packages/core/tests/NodeflowChunking.test.ts`
    Expected Result: All tests pass (≥5 test cases per file)
    Evidence: .sisyphus/evidence/task-11-selection-chunking-tests.txt
  ```

  **Commit**: YES

  - Message: `test(core): add SelectionMap and NodeflowChunking behavioral tests`
  - Files: `packages/core/tests/SelectionMap.test.ts`, `packages/core/tests/NodeflowChunking.test.ts`
  - Pre-commit: `bun test`

- [x] 12. Behavioral Tests for Changes (Undo/Redo)

  **What to do**:

  - Create `packages/core/tests/Changes.test.ts`
  - Test:
    - Adding a change to history
    - `undo()` — reverts last change
    - `redo()` — re-applies last undone change
    - Multiple undo/redo in sequence
    - Undo limit (if applicable)
    - New change after undo clears redo stack

  **Must NOT do**:

  - Do NOT modify Changes.ts (it's likely already framework-agnostic)

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-11)
  - **Blocks**: None (Changes is already framework-agnostic)
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:

  - `src/utils/data/Changes.ts` — Changes class and Change type; undo/redo implementation

  **WHY Each Reference Matters**:

  - Need to understand the Change interface (do/undo callbacks) and Changes class API

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Changes tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/Changes.test.ts`
    Expected Result: All tests pass (≥5 test cases covering undo, redo, history management)
    Evidence: .sisyphus/evidence/task-12-changes-tests.txt
  ```

  **Commit**: YES

  - Message: `test(core): add Changes (undo/redo) behavioral tests`
  - Files: `packages/core/tests/Changes.test.ts`
  - Pre-commit: `bun test`

- [ ] 13. Move Framework-Agnostic Files to @nodeflow/core

  **What to do**:

  - Move the following files from `src/utils/data/` to `packages/core/src/`:
    - `Vec2.ts` — 2D vector math (zero framework dependencies)
    - `Rect.ts` — rectangle geometry (zero framework dependencies)
    - `CurveFunctions.ts` — curve calculation functions
    - `ArrayWrapper.ts` — generic array utility
    - `Changes.ts` — undo/redo history
    - `ConnectorDestination.ts` — destination data model
    - `ConnectorSource.ts` — source data model
  - Move `src/utils/constants.ts` to `packages/core/src/constants.ts`
  - Move `src/utils/math-utils.ts` to `packages/core/src/math-utils.ts`
  - Move `src/utils/misc-utils.ts` to `packages/core/src/misc-utils.ts`
  - Update all import paths in moved files to be relative within packages/core/src/
  - Update `packages/core/src/index.ts` to re-export all moved modules
  - Update import paths in files that still reference these from old locations (create aliases or update)
  - Verify no moved file imports from solid-js, solid-js/store, or @solid-primitives/\*

  **Must NOT do**:

  - Do NOT modify the logic of any moved file
  - Do NOT refactor the moved files — pure move + import path updates only
  - Do NOT move files that have Solid imports (those are handled in later tasks)

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Straightforward file moves and import path updates, no logic changes
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-19)
  - **Blocks**: Task 14
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:

  - `src/utils/data/Vec2.ts` — confirm zero Solid imports before moving
  - `src/utils/data/Rect.ts` — confirm zero Solid imports; may import Vec2
  - `src/utils/data/CurveFunctions.ts` — confirm zero Solid imports
  - `src/utils/data/ArrayWrapper.ts` — confirm zero Solid imports
  - `src/utils/data/Changes.ts` — verify imports (should be framework-agnostic)
  - `src/utils/data/ConnectorDestination.ts` — verify imports
  - `src/utils/data/ConnectorSource.ts` — verify imports
  - `src/utils/constants.ts` — keyboard/mouse constants, no Solid deps
  - `src/utils/math-utils.ts` — math utilities
  - `src/utils/misc-utils.ts` — generic utilities (deepCopy, intersectionOfSets, isSetEmpty)

  **WHY Each Reference Matters**:

  - Each file must be verified as framework-agnostic BEFORE moving — if it has a hidden Solid import, it needs refactoring first
  - Import paths between these files must be updated to work within packages/core/src/

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All moved files compile in @nodeflow/core
    Tool: Bash
    Preconditions: Files moved to packages/core/src/
    Steps:
      1. Run `bun run build` in packages/core/
      2. Verify dist/ output contains all moved modules
    Expected Result: Build exits 0, all modules in dist/
    Failure Indicators: Import resolution errors, missing exports
    Evidence: .sisyphus/evidence/task-13-core-build.txt

  Scenario: No Solid imports in moved files
    Tool: Bash
    Preconditions: Files moved to packages/core/src/
    Steps:
      1. Run `grep -r "solid-js\|@solid-primitives" packages/core/src/`
      2. Assert 0 matches
    Expected Result: Zero Solid references in core source
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/task-13-no-solid.txt

  Scenario: Existing tests still pass
    Tool: Bash
    Steps:
      1. Run `bun test`
      2. Verify all Wave 2 tests still pass (import paths may need updating)
    Expected Result: All tests pass
    Failure Indicators: Import resolution failures
    Evidence: .sisyphus/evidence/task-13-tests-pass.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): move framework-agnostic utility files to @nodeflow/core`
  - Files: `packages/core/src/Vec2.ts`, `packages/core/src/Rect.ts`, `packages/core/src/CurveFunctions.ts`, `packages/core/src/ArrayWrapper.ts`, `packages/core/src/Changes.ts`, `packages/core/src/ConnectorDestination.ts`, `packages/core/src/ConnectorSource.ts`, `packages/core/src/constants.ts`, `packages/core/src/math-utils.ts`, `packages/core/src/misc-utils.ts`
  - Pre-commit: `bun test`

- [ ] 14. Refactor Types — Make DisplayFunc Generic, Remove JSX/ReactiveMap from Core Types

  **What to do**:

  - Copy `src/nodeflow-types/types.ts` to `packages/core/src/types.ts`
  - Replace `DisplayFunc` definition:
    - Current: `export type DisplayFunc = (props: { node: NodeflowNodeData }) => Optional<JSX.Element>;`
    - New: `export type DisplayFunc<T = unknown> = (props: { node: NodeflowNodeData }) => Optional<T>;`
  - Remove `import { JSX } from "solid-js"` — no longer needed
  - Replace all `ReactiveMap<K, V>` type references with `Map<K, V>`:
    - `NodeflowNodeType.connectorSections: ReactiveMap<string, ConnectorSection>` → `Map<string, ConnectorSection>`
    - `ConnectorSectionType.connectors: ReactiveMap<string, NodeConnector>` → `Map<string, NodeConnector>`
  - Remove `import { ReactiveMap } from "@solid-primitives/map"`
  - Remove DOM references from core types:
    - `NodeflowNodeType.ref?: HTMLDivElement` → remove from core type (move to adapter-specific extended type)
    - `NodeflowNodeType.resizeObserver?: ResizeObserver` → remove from core type
    - `NodeConnectorType.ref?: HTMLDivElement` → remove from core type
    - `NodeConnectorType.resizeObserver?: ResizeObserver` → remove from core type
  - Create `packages/solid/src/types.ts` with extended types that include the DOM refs:
    - `export type SolidNodeflowNodeType = NodeflowNodeType & { ref?: HTMLDivElement; resizeObserver?: ResizeObserver; }`
  - Export all types from `packages/core/src/index.ts`

  **Must NOT do**:

  - Do NOT change type names (except DisplayFunc gaining a generic parameter)
  - Do NOT reorganize the type file structure beyond the necessary changes
  - Do NOT add new types that aren't needed for this refactor

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Type refactoring affects every consumer; must be precise about what's generic vs framework-specific
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13, 15-19)
  - **Blocks**: Tasks 16-24
  - **Blocked By**: Task 13

  **References**:

  **Pattern References**:

  - `src/nodeflow-types/types.ts` — the complete type file to refactor; line 1: `import { JSX } from "solid-js"`, line 8: `import { ReactiveMap }`, line 78-80: DisplayFunc definition, line 84: `ReactiveMap<string, ConnectorSection>`, line 91: `ref?: HTMLDivElement`, line 92: `resizeObserver?: ResizeObserver`, line 97: `ReactiveMap<string, NodeConnector>`, line 130: `ref?: HTMLDivElement`, line 131: `resizeObserver?: ResizeObserver`
  - `src/nodeflow-types/index.ts` — barrel export file, will need updating

  **WHY Each Reference Matters**:

  - types.ts is the central type authority — every model file imports from it. Changes here cascade everywhere.
  - Line numbers pinpoint every Solid/DOM reference that must be removed for core isolation

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Core types compile with zero Solid/DOM dependencies
    Tool: Bash
    Preconditions: packages/core/src/types.ts exists
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives|HTMLDivElement|ResizeObserver" packages/core/src/types.ts`
      2. Assert 0 matches
      3. Run `bun run build` in packages/core/
    Expected Result: Zero Solid/DOM references, build succeeds
    Failure Indicators: Any Solid or DOM reference found
    Evidence: .sisyphus/evidence/task-14-types-clean.txt

  Scenario: DisplayFunc is generic
    Tool: Bash
    Preconditions: types.ts refactored
    Steps:
      1. Grep packages/core/src/types.ts for "DisplayFunc<"
      2. Verify the generic parameter exists
    Expected Result: DisplayFunc<T = unknown> pattern found
    Failure Indicators: DisplayFunc still references JSX.Element
    Evidence: .sisyphus/evidence/task-14-displayfunc-generic.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): make types framework-agnostic with generic DisplayFunc`
  - Files: `packages/core/src/types.ts`, `packages/solid/src/types.ts`
  - Pre-commit: `bun run build`

- [ ] 15. Refactor EventPublishers — Replace ReactiveMap with Map

  **What to do**:

  - Copy `src/utils/data/EventPublishers.ts` to `packages/core/src/EventPublishers.ts`
  - Replace `import { ReactiveMap } from "@solid-primitives/map"` with nothing (use native Map)
  - In `BaseEventPublisher`:
    - `private subscriptions = new ReactiveMap<...>()` → `private subscriptions = new Map<...>()`
    - `private blacklistFilters = new ReactiveMap<...>()` → `private blacklistFilters = new Map<...>()`
  - Verify all methods (subscribe, publish, unsubscribe, priority sorting, blacklist filtering) work identically with Map — ReactiveMap extends Map, so the API is identical
  - Add EventEmitter pattern: after publish completes, emit a change notification that adapters can listen to
  - Run existing EventPublishers tests (from Task 10) to confirm behavior preservation
  - Update `packages/core/src/index.ts` to export EventPublishers

  **Must NOT do**:

  - Do NOT change the event naming scheme
  - Do NOT change the subscription model (priority, blacklist, etc.)
  - Do NOT add new event types

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — straightforward ReactiveMap→Map swap, but must preserve all pub/sub behavior
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13, 14, 16-19)
  - **Blocks**: Tasks 25, 26
  - **Blocked By**: Tasks 10, 2

  **References**:

  **Pattern References**:

  - `src/utils/data/EventPublishers.ts:1` — `import { ReactiveMap }` to remove
  - `src/utils/data/EventPublishers.ts:23-26` — `subscriptions = new ReactiveMap<...>` to replace with Map
  - `src/utils/data/EventPublishers.ts:27-30` — `blacklistFilters = new ReactiveMap<...>` to replace with Map
  - `packages/core/tests/EventPublishers.test.ts` (from Task 10) — behavioral tests to verify against

  **WHY Each Reference Matters**:

  - EventPublishers.ts lines show exactly where ReactiveMap is used — only 3 instances, all as Map replacements
  - ReactiveMap extends Map, so the public API (get, set, delete, forEach, entries) is identical — this should be a safe swap
  - Tests from Task 10 are the safety net — run before and after

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: EventPublishers tests still pass after refactor
    Tool: Bash
    Preconditions: EventPublishers refactored to use Map
    Steps:
      1. Run `bun test packages/core/tests/EventPublishers.test.ts`
    Expected Result: All tests pass (same count as before refactor)
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-15-eventpub-tests.txt

  Scenario: No Solid imports in EventPublishers
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives|ReactiveMap" packages/core/src/EventPublishers.ts`
    Expected Result: 0 matches
    Failure Indicators: Any Solid reference
    Evidence: .sisyphus/evidence/task-15-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from EventPublishers — ReactiveMap to Map`
  - Files: `packages/core/src/EventPublishers.ts`
  - Pre-commit: `bun test`

- [ ] 16. Refactor KeyboardData — Remove createStore + produce

  **What to do**:

  - Copy `src/utils/data/KeyboardData.ts` to `packages/core/src/KeyboardData.ts`
  - Remove `import { createStore, produce } from "solid-js/store"`
  - Replace store pattern with plain class properties:
    - Remove `private readonly store` field
    - Add `private _heldKeys: Set<KeyboardKeyCode> = new Set()`
  - Rewrite getters/setters:
    - `get heldKeys()` → return `this._heldKeys`
    - `set heldKeys(keys)` → `this._heldKeys = keys` + emit change
    - `releaseKey(key)` → `this._heldKeys.delete(key)` (was `produce((state) => state.heldKeys.delete(key))`)
    - `clearKeys()` → `this._heldKeys = new Set()` (was `store[1]({ heldKeys: new Set() })`)
    - `pressKey(key)` → `this._heldKeys.add(key)` (was `produce((state) => state.heldKeys.add(key))`)
  - `hasKeyPressed` and `isActionPressed` — no changes needed (they only read `this.heldKeys`)
  - Run tests from Task 9 to verify behavior preservation

  **Must NOT do**:

  - Do NOT change the public API (method names, parameters, return types)
  - Do NOT add new methods

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Straightforward store→property replacement, well-bounded scope (48-line file)
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13-15, 17-19)
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 9, 14

  **References**:

  **Pattern References**:

  - `src/utils/data/KeyboardData.ts` — entire file (48 lines); line 1: `createStore, produce` import; line 16: `createStore<KeyboardDataType>` call; line 26: `store[1]({ heldKeys: keys })` setter; line 30: `produce((state) => state.heldKeys.delete(key))`; line 38: `produce((state) => state.heldKeys.add(key))`
  - `packages/core/tests/KeyboardData.test.ts` (from Task 9) — behavioral tests

  **WHY Each Reference Matters**:

  - KeyboardData.ts is small and self-contained — all Solid patterns are visible in the reference
  - The `produce` calls on lines 30/38 are Set mutations that become direct method calls on plain Set

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: KeyboardData tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/KeyboardData.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-16-keyboard-tests.txt

  Scenario: No Solid imports in KeyboardData
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|createStore|produce" packages/core/src/KeyboardData.ts`
    Expected Result: 0 matches
    Failure Indicators: Any Solid reference
    Evidence: .sisyphus/evidence/task-16-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from KeyboardData`
  - Files: `packages/core/src/KeyboardData.ts`
  - Pre-commit: `bun test`

- [ ] 17. Refactor SelectionBoxData — Remove createStore

  **What to do**:

  - Copy `src/utils/data/SelectionBoxData.ts` to `packages/core/src/SelectionBoxData.ts`
  - Remove `import { createStore } from "solid-js/store"`
  - Replace store with plain properties:
    - Remove `private readonly store` field
    - Add `private _boundingBox: Rect | undefined = undefined`
    - Add `private _selections: SelectionMap`
  - Rewrite getters/setters:
    - `get boundingBox()` → return `this._boundingBox`
    - `set boundingBox(value)` → `this._boundingBox = value` + existing side-effect logic (selection transfer on undefined, chunk query on Rect)
    - `get selections()` → return `this._selections`
  - The `set boundingBox` setter has important side effects (lines 28-64): when set to undefined, it transfers selected nodes to mouseData.selections; when set to a Rect, it queries chunking for intersecting nodes. These MUST be preserved.
  - Run tests from Task 9 to verify behavior preservation

  **Must NOT do**:

  - Do NOT change the boundingBox setter side effects
  - Do NOT refactor the selection transfer logic

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Small file but has non-trivial setter side effects that must be preserved exactly
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13-16, 18-19)
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 9, 14

  **References**:

  **Pattern References**:

  - `src/utils/data/SelectionBoxData.ts` — entire file (64 lines); line 2: `createStore` import; line 16: `createStore<SelectionBoxDataType>` call; line 26-64: `set boundingBox` with side effects (selection transfer + chunk query)
  - `packages/core/tests/SelectionBoxData.test.ts` (from Task 9) — behavioral tests

  **WHY Each Reference Matters**:

  - The `boundingBox` setter (lines 26-64) contains critical side-effect logic — this is NOT a simple property swap, the side effects must remain

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SelectionBoxData tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/SelectionBoxData.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-17-selectionbox-tests.txt

  Scenario: No Solid imports in SelectionBoxData
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|createStore" packages/core/src/SelectionBoxData.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-17-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from SelectionBoxData`
  - Files: `packages/core/src/SelectionBoxData.ts`
  - Pre-commit: `bun test`

- [ ] 18. Refactor MouseData — Remove createStore

  **What to do**:

  - Copy `src/utils/data/MouseData.ts` to `packages/core/src/MouseData.ts`
  - Remove `import { createStore } from "solid-js/store"`
  - Replace store with plain class properties:
    - `private _clickStartPosition: Vec2 | undefined = undefined`
    - `private _mousePosition: Vec2 = Vec2.zero()`
    - `private _heldMouseButtons: Set<MOUSE_BUTTONS> = new Set()`
    - `private _pointerDown: boolean = false`
    - `private _selections: SelectionMap`
    - `private _selectionBox: SelectionBoxData`
  - Rewrite all getters/setters to access the private properties instead of `this.store[0]`/`this.store[1]`
  - Preserve the `update()` method logic (it takes a partial object and applies matching fields)
  - Preserve `serialize()` / `deserialize()` exactly as-is
  - Preserve `reset()`, `heldObject`, `isHoldingObject`, `isNodeSelected` logic
  - Run tests from Task 9

  **Must NOT do**:

  - Do NOT change MouseData's public API
  - Do NOT change the serialize/deserialize format
  - Do NOT change the update() partial-apply pattern

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Larger file (234 lines) with many getters/setters, but each is a mechanical store→property swap
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13-17, 19)
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 9, 14, 16, 17

  **References**:

  **Pattern References**:

  - `src/utils/data/MouseData.ts` — full file (234 lines); line 1: `createStore` import; line 28: `createStore<MouseDataType>` with 6 fields; each getter reads `store[0].X`, each setter calls `store[1]({X: value})`
  - `packages/core/src/KeyboardData.ts` (from Task 16) — use the same refactoring pattern already applied in KeyboardData
  - `packages/core/tests/MouseData.test.ts` (from Task 9) — behavioral tests

  **WHY Each Reference Matters**:

  - MouseData.ts has the most getters/setters of any model file — the Task 16 refactoring pattern should be mechanically applied here
  - Tests ensure no behavioral regression across the many property accessors

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MouseData tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/MouseData.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-18-mouse-tests.txt

  Scenario: No Solid imports in MouseData
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|createStore" packages/core/src/MouseData.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-18-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from MouseData`
  - Files: `packages/core/src/MouseData.ts`
  - Pre-commit: `bun test`

- [ ] 19. Refactor SelectionMap — Replace 3 ReactiveMap with Map

  **What to do**:

  - Copy `src/utils/SelectionMap.ts` to `packages/core/src/SelectionMap.ts`
  - Remove `import { ReactiveMap } from "@solid-primitives/map"`
  - Replace all 3 ReactiveMap instances with Map:
    - `private readonly connectorsMap = new ReactiveMap<string, NodeConnector>()` → `new Map<...>()`
    - `private readonly nodesMap = new ReactiveMap<string, NodeflowNodeData>()` → `new Map<...>()`
    - `private readonly connectionsMap = new ReactiveMap<string, SelectableConnection>()` → `new Map<...>()`
  - All methods (add, delete, has, clear, forEach, toObject, fromObject, selectedNodes, selectedConnectors, selectedConnections) use standard Map API — no changes needed
  - The `createHash` static method is pure computation — no changes needed
  - Run tests from Task 11

  **Must NOT do**:

  - Do NOT change the selection logic or hash computation
  - Do NOT add new selection types

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Mechanical ReactiveMap→Map swap across 3 fields; ReactiveMap extends Map so API is identical
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13-18)
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 11, 14

  **References**:

  **Pattern References**:

  - `src/utils/SelectionMap.ts` — full file (357 lines); line 8: `import { ReactiveMap }`; line 11: `connectorsMap = new ReactiveMap<string, NodeConnector>()`; line 12: `nodesMap = new ReactiveMap<string, NodeflowNodeData>()`; line 13-16: `connectionsMap = new ReactiveMap<string, SelectableConnection>()`
  - `packages/core/tests/SelectionMap.test.ts` (from Task 11) — behavioral tests

  **WHY Each Reference Matters**:

  - SelectionMap.ts uses ReactiveMap only for its Map API — the swap is safe because ReactiveMap extends Map
  - Tests validate the full CRUD and iteration behavior

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SelectionMap tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/SelectionMap.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-19-selectionmap-tests.txt

  Scenario: No Solid imports in SelectionMap
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives|ReactiveMap" packages/core/src/SelectionMap.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-19-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from SelectionMap — ReactiveMap to Map`
  - Files: `packages/core/src/SelectionMap.ts`
  - Pre-commit: `bun test`

- [ ] 20. Refactor NodeflowChunking — Remove createStore + ReactiveMap

  **What to do**:

  - Copy `src/utils/data/NodeflowChunking.ts` to `packages/core/src/NodeflowChunking.ts`
  - Remove `import { createStore } from "solid-js/store"` and `import { ReactiveMap } from "@solid-primitives/map"`
  - Replace store + ReactiveMap with plain properties:
    - `private _chunkSize: number`
    - `private _chunks: Map<Vec2Hash, Set<string>> = new Map()`
  - Rewrite getters/setters:
    - `get chunkSize()` → return `this._chunkSize`
    - `set chunkSize(size)` → `this._chunkSize = size`
    - `get chunks()` → return `this._chunks`
    - `set chunks(chunks)` → `this._chunks = chunks`
  - All chunking methods (addNodeToChunk, removeNodeFromChunk, updateNodeInChunk, getNodesInRect, getCollidingNodes, calculateChunkPosition) use standard Map API on `this.chunks` — ReactiveMap extends Map, so no API changes needed
  - Run tests from Task 11

  **Must NOT do**:

  - Do NOT change the spatial chunking algorithm
  - Do NOT change chunk size defaults

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Moderate file (165 lines) with createStore + ReactiveMap, but chunking algorithm stays untouched
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21-24)
  - **Blocks**: Task 23
  - **Blocked By**: Task 19

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeflowChunking.ts` — full file (165 lines); line 2: `createStore` import; line 3: `ReactiveMap` import; line 14: `createStore({ chunkSize, chunks: new ReactiveMap<...>() })`; line 28-34: chunks getter/setter using `store[0]`/`store[1]`
  - `packages/core/src/SelectionMap.ts` (from Task 19) — ReactiveMap→Map pattern already applied, use as reference
  - `packages/core/tests/NodeflowChunking.test.ts` (from Task 11) — behavioral tests

  **WHY Each Reference Matters**:

  - NodeflowChunking uses the same createStore + ReactiveMap pattern as simpler models — follow the same replacement strategy
  - Task 19's SelectionMap provides a concrete example of ReactiveMap→Map replacement

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NodeflowChunking tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/NodeflowChunking.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-20-chunking-tests.txt

  Scenario: No Solid imports in NodeflowChunking
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives|ReactiveMap|createStore" packages/core/src/NodeflowChunking.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-20-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from NodeflowChunking`
  - Files: `packages/core/src/NodeflowChunking.ts`
  - Pre-commit: `bun test`

- [ ] 21. Refactor NodeConnector — Remove createStore

  **What to do**:

  - Copy `src/utils/data/NodeConnector.ts` to `packages/core/src/NodeConnector.ts`
  - Remove `import { createStore } from "solid-js/store"`
  - Replace `private readonly store` with individual class properties mirroring `NodeConnectorType`:
    - `private _css?: string`
    - `private _destinations: ArrayWrapper<ConnectorDestination>`
    - `private _hovered: boolean`
    - `private _id: string`
    - `private _parentSection: ConnectorSectionType`
    - `private _position: Vec2`
    - `private _size: Vec2`
    - `private _sources: ArrayWrapper<ConnectorSource>`
  - Note: `ref` and `resizeObserver` are already removed from core types in Task 14 — do NOT include them as class properties
  - Rewrite all getters to read from private properties instead of `this.store[0].X`
  - Rewrite all setters to write to private properties instead of `this.store[1]({X: value})`
  - Preserve all business logic: serialize, serializeConnections, addDestination, removeDestination, addSource, removeSource, removeConnectionsTo, parentNode getter
  - Run tests from Task 8

  **Must NOT do**:

  - Do NOT change connection logic
  - Do NOT add DOM ref properties to core (those belong in adapter)

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: 209-line file with many getters/setters, but mechanical replacement pattern
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 20, 22-24)
  - **Blocks**: Task 22
  - **Blocked By**: Tasks 8, 14

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeConnector.ts` — full file (209 lines); line 1: `createStore` import; line 21: `createStore<NodeConnectorType>(data)` call; every getter reads `store[0].X`, every setter calls `store[1]({X: value})`
  - `packages/core/src/KeyboardData.ts` (from Task 16) — reference for the createStore→property replacement pattern
  - `packages/core/tests/NodeConnector.test.ts` (from Task 8) — behavioral tests

  **WHY Each Reference Matters**:

  - NodeConnector.ts follows the same createStore pattern as KeyboardData — apply the same mechanical replacement
  - Tests ensure connection management logic is preserved

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NodeConnector tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/NodeConnector.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-21-connector-tests.txt

  Scenario: No Solid imports in NodeConnector
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|createStore" packages/core/src/NodeConnector.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-21-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from NodeConnector`
  - Files: `packages/core/src/NodeConnector.ts`
  - Pre-commit: `bun test`

- [ ] 22. Refactor ConnectorSection — Remove createStore + ReactiveMap

  **What to do**:

  - Copy `src/utils/data/ConnectorSection.ts` to `packages/core/src/ConnectorSection.ts`
  - Remove `import { createStore } from "solid-js/store"` and `import { ReactiveMap } from "@solid-primitives/map"`
  - Replace store with plain properties:
    - `private _connectors: Map<string, NodeConnector> = new Map()` (was ReactiveMap)
    - `private _css?: string`
    - `private _id: string`
    - `private _parentNode: NodeflowNodeData`
  - Rewrite getters/setters
  - Preserve all business logic:
    - `serialize()` — iterate connectors map, serialize each
    - `static deserialize()` — create section from serialized data with history support
    - `addConnector()` — create connector, add to map, register history change
    - `removeConnector()` — remove from map, clean up connections, register history change
    - `getNextFreeConnectorId()` — find unused ID
  - Note: ConnectorSection imports `NodeflowLib` for history changes — this import must be updated when NodeflowLib is split (Task 26). For now, keep the import path working.
  - Run tests from Task 8

  **Must NOT do**:

  - Do NOT change the connector management logic
  - Do NOT change the history integration

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: 234-line file with createStore + ReactiveMap + history integration
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 20, 21, 23, 24)
  - **Blocks**: Task 23
  - **Blocked By**: Task 21

  **References**:

  **Pattern References**:

  - `src/utils/data/ConnectorSection.ts` — full file (234 lines); line 1: `createStore` import; line 11: `ReactiveMap` import; line 22: `createStore<ConnectorSectionType>(data)` call; connectors stored as ReactiveMap
  - `packages/core/src/SelectionMap.ts` (from Task 19) — ReactiveMap→Map pattern reference
  - `packages/core/tests/ConnectorSection.test.ts` (from Task 8) — behavioral tests

  **WHY Each Reference Matters**:

  - ConnectorSection has both createStore AND ReactiveMap (for connectors) — needs both replacement patterns
  - History integration (Changes class) must be preserved exactly

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ConnectorSection tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/ConnectorSection.test.ts`
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-22-section-tests.txt

  Scenario: No Solid imports in ConnectorSection
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives|ReactiveMap|createStore" packages/core/src/ConnectorSection.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-22-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from ConnectorSection`
  - Files: `packages/core/src/ConnectorSection.ts`
  - Pre-commit: `bun test`

- [ ] 23. Refactor NodeflowNodeData — Remove createStore + createEffect (Collision)

  **What to do**:

  - Copy `src/utils/data/NodeflowNodeData.ts` to `packages/core/src/NodeflowNodeData.ts`
  - Remove `import { createStore } from "solid-js/store"` and `import { createEffect } from "solid-js"`
  - Remove `import { ReactiveMap } from "@solid-primitives/map"` (used for connectorSections type, now Map from Task 14)
  - Replace store with plain class properties mirroring `NodeflowNodeType`:
    - `private _centered: boolean`
    - `private _connectorSections: Map<string, ConnectorSection>`
    - `private _css: SelectableElementCSS`
    - `private _customData: CustomNodeflowDataType`
    - `private _display: DisplayFunc`
    - `private _id: string`
    - `private _offset: Vec2`
    - `private _position: Vec2`
    - `private _size: Vec2`
  - **CRITICAL — Collision createEffect**: The constructor has a nested `createEffect` (lines 30-54) that detects and resolves node collisions. Convert this to an imperative method:
    - Create `public checkAndResolveCollisions(): void` — contains the same collision logic
    - Call this method from the `position` setter (after `this._position = value`)
    - This makes collision checking explicit rather than reactive
  - Preserve all business logic: serialize, deserialize, addConnectorSection, removeConnectorSection, getConnector, update, select, getCenter, getCollidingNodes, rectWithOffset
  - Run tests from Task 7

  **Must NOT do**:

  - Do NOT change the collision resolution algorithm — only change WHEN it's called (setter vs effect)
  - Do NOT refactor connectorSections management
  - Do NOT add DOM ref/resizeObserver properties (removed in Task 14)

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: 514-line file with the tricky createEffect→imperative conversion for collision logic
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 20-22, 24)
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 7, 20, 22

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeflowNodeData.ts` — full file (514 lines); line 9: `createStore` import; line 19: `createEffect` import; line 12: `ReactiveMap` import; line 27: `createStore<NodeflowNodeType>(data)` call; lines 30-54: nested `createEffect` for collision detection — THIS IS THE HARDEST PART
  - `src/utils/data/NodeflowNodeData.ts:30-54` — collision createEffect: outer effect checks `getCollidingNodes()`, inner effect resolves each collision by adjusting position. Must become imperative `checkAndResolveCollisions()` called from position setter.
  - `packages/core/src/KeyboardData.ts` (from Task 16) — createStore→property pattern reference
  - `packages/core/tests/NodeflowNodeData.test.ts` (from Task 7) — behavioral tests

  **WHY Each Reference Matters**:

  - Lines 30-54 are the most complex Solid-specific pattern in the entire codebase — nested createEffects that auto-track reactive dependencies. Converting to imperative requires understanding WHEN collisions should be checked (answer: after every position change).
  - The collision logic itself is pure math (Rect.intersects, Vec2 subtraction/normalization) — only the scheduling changes.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NodeflowNodeData tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/NodeflowNodeData.test.ts`
    Expected Result: All tests pass (especially collision-related tests)
    Failure Indicators: Any test failure, especially collision tests
    Evidence: .sisyphus/evidence/task-23-nodedata-tests.txt

  Scenario: No Solid imports in NodeflowNodeData
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|createStore|createEffect|@solid-primitives|ReactiveMap" packages/core/src/NodeflowNodeData.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-23-no-solid.txt

  Scenario: Collision method exists and is called from position setter
    Tool: Bash
    Steps:
      1. Grep packages/core/src/NodeflowNodeData.ts for "checkAndResolveCollisions"
      2. Verify it appears in both a method definition and the position setter
    Expected Result: Method defined and called from setter
    Evidence: .sisyphus/evidence/task-23-collision-imperative.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from NodeflowNodeData — createEffect to imperative collision check`
  - Files: `packages/core/src/NodeflowNodeData.ts`
  - Pre-commit: `bun test`

- [ ] 24. Refactor NodeflowData — Remove createStore ×2, ReactiveMap, produce (THE BIG ONE)

  **What to do**:

  - Copy `src/utils/data/NodeflowData.ts` to `packages/core/src/NodeflowData.ts`
  - Remove all Solid imports: `createStore`, `produce` from `solid-js/store`; `ReactiveMap` from `@solid-primitives/map`
  - This is the largest file (1506 lines) with the most Solid usage. Systematic approach:

  **Store 1 — Main state (`NodeflowDataType`)**:

  - Replace `this.store = createStore<NodeflowDataType>(...)` with individual properties:
    - `private _currentMoveSpeed: Vec2`
    - `private _intervalId: number | undefined`
    - `private _pinchDistance: number`
    - `private _position: Vec2`
    - `private _size: Vec2`
    - `private _startPosition: Vec2`
    - `private _zoomLevel: number`
  - Rewrite all `this.store[0].X` → `this._X` and `this.store[1]({X: value})` → `this._X = value`

  **Store 2 — Settings store (`NodeflowSettings`)**:

  - Replace `this.settingsStore = createStore<NodeflowSettings>(...)` with:
    - `private _settings: NodeflowSettings`
  - Rewrite settings getters/setters

  **ReactiveMap — Nodes**:

  - Replace `public readonly nodes = new ReactiveMap<string, NodeflowNodeData>()` with `public readonly nodes = new Map<string, NodeflowNodeData>()`
  - ReactiveMap extends Map — all CRUD methods (get, set, delete, has, forEach, entries, values, size) are identical

  **`produce` calls**:

  - Replace all `this.store[1](produce((state) => { ... }))` patterns with direct property mutation
  - Example: `produce((state) => { state.position = newPos })` → `this._position = newPos`
  - The `produce` function is essentially immer-like — since we're now using plain objects, direct mutation is the correct replacement

  **Other concerns**:

  - `NodeflowData` imports `NodeflowLib` — this import will be updated when NodeflowLib is split in Task 26
  - The constructor calls `this.setupDefaultEventHandlers()` — this stays in core
  - Preserve ALL business logic: addNode, removeNode, addConnection, removeConnection, updateZoom, transformVec2ToCanvas, serialize, deserialize, updateSettings, getNextFreeNodeId, getAllSourceConnectors, node dragging, panning, etc.
  - Run tests from Task 6

  **Must NOT do**:

  - Do NOT restructure NodeflowData (it's 1506 lines and that's OK for now)
  - Do NOT split it into smaller files
  - Do NOT change any business logic
  - Do NOT change the public API

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: 1506-line file, the largest and most complex refactoring task; requires careful systematic replacement across hundreds of getter/setter/produce patterns
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 20-23)
  - **Blocks**: Tasks 25, 26
  - **Blocked By**: Tasks 6, 18, 23

  **References**:

  **Pattern References**:

  - `src/utils/data/NodeflowData.ts` — full file (1506 lines); line 2: `createStore, produce` import; line 18: `ReactiveMap` import; line 42-: `createStore<NodeflowDataType>` (main store); settings store (second createStore); `nodes = new ReactiveMap<string, NodeflowNodeData>()`; multiple `produce()` calls throughout for state mutations
  - `src/utils/data/NodeflowData.ts:54` — `DEFAULT_SETTINGS` static — this is the settings shape, stays as-is
  - `src/utils/data/NodeflowData.ts` — `setupDefaultEventHandlers()` — large method (~200 lines) configuring event subscriptions; business logic stays, but any Solid-specific reactive tracking is replaced
  - `packages/core/src/MouseData.ts` (from Task 18) — the most similar refactoring pattern (createStore with many getters/setters)
  - `packages/core/tests/NodeflowData.test.ts` (from Task 6) — behavioral tests covering CRUD, serialize, zoom, transform

  **WHY Each Reference Matters**:

  - NodeflowData.ts is the heart of the library — every other model file connects to it. The refactoring must be mechanical (store→property) without touching business logic.
  - Task 18 (MouseData) established the pattern at a smaller scale — apply the same pattern here at larger scale.
  - Task 6 tests are the critical safety net — they verify ALL public API behavior is preserved.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All NodeflowData tests pass after refactor
    Tool: Bash
    Steps:
      1. Run `bun test packages/core/tests/NodeflowData.test.ts`
    Expected Result: All tests pass (≥10 test cases)
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-24-nodeflowdata-tests.txt

  Scenario: No Solid imports in NodeflowData
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives|ReactiveMap|createStore|produce" packages/core/src/NodeflowData.ts`
    Expected Result: 0 matches
    Failure Indicators: Any Solid reference
    Evidence: .sisyphus/evidence/task-24-no-solid.txt

  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. Run `bun test` (all tests across all packages)
    Expected Result: All tests pass
    Failure Indicators: Any regression in previously passing tests
    Evidence: .sisyphus/evidence/task-24-full-suite.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): remove Solid from NodeflowData — createStore, ReactiveMap, produce to plain objects`
  - Files: `packages/core/src/NodeflowData.ts`
  - Pre-commit: `bun test`

- [ ] 25. Extract Core Measurement API — Move Component-to-Model Writes

  **What to do**:

  - Currently, SolidJS components write directly to model objects (e.g., NodeflowNode.tsx sets `node.size`, `node.offset`, `node.ref`; Connector.tsx sets `connector.position`, `connector.size`, `connector.ref`; NodeflowCanvas.tsx sets `nodeflowData.size`).
  - These writes must become explicit core API methods that adapters call:
  - Add to `NodeflowNodeData`:
    - `updateMeasurements(size: Vec2, offset: Vec2): void` — replaces component writing node.size/node.offset
  - Add to `NodeConnector`:
    - `updateMeasurements(position: Vec2, size: Vec2): void` — replaces component writing connector.position/connector.size
  - Add to `NodeflowData`:
    - `updateCanvasSize(size: Vec2): void` — replaces component writing nodeflowData.size
  - These methods are the ONLY way adapters should update DOM-derived measurements in the core
  - Adapters will call these methods from ResizeObserver callbacks and layout effects
  - Update `packages/core/src/index.ts` to export these new methods (they're on existing classes)

  **Must NOT do**:

  - Do NOT remove the existing setters (they're still used internally)
  - Do NOT add DOM types (HTMLDivElement, ResizeObserver) to core — adapters manage DOM refs
  - Do NOT change how measurements are used internally

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Requires understanding component-to-model data flow and designing clean API boundary
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 26-30)
  - **Blocks**: Tasks 29, 30
  - **Blocked By**: Task 24

  **References**:

  **Pattern References**:

  - `src/components/NodeflowNode.tsx` — writes to `node.size`, `node.offset`, `node.ref` via ResizeObserver callback
  - `src/components/Connector.tsx` — writes to `connector.position`, `connector.size`, `connector.ref` via ResizeObserver
  - `src/components/NodeflowCanvas.tsx` — writes to `nodeflowData.size` from canvas element measurement
  - `packages/core/src/NodeflowNodeData.ts` (from Task 23) — where to add `updateMeasurements()`
  - `packages/core/src/NodeConnector.ts` (from Task 21) — where to add `updateMeasurements()`
  - `packages/core/src/NodeflowData.ts` (from Task 24) — where to add `updateCanvasSize()`

  **WHY Each Reference Matters**:

  - Component files show EXACTLY what data flows from DOM → model. The new API methods must accept the same data.
  - Core files show the current property access patterns that the new methods will wrap.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Measurement API methods exist and compile
    Tool: Bash
    Preconditions: Methods added to core classes
    Steps:
      1. Grep packages/core/src/ for "updateMeasurements\|updateCanvasSize"
      2. Run `bun run build` in packages/core/
    Expected Result: Methods found in NodeflowNodeData, NodeConnector, NodeflowData; build passes
    Failure Indicators: Methods missing, build errors
    Evidence: .sisyphus/evidence/task-25-measurement-api.txt

  Scenario: All existing tests still pass
    Tool: Bash
    Steps:
      1. Run `bun test`
    Expected Result: All tests pass — new methods don't break existing behavior
    Evidence: .sisyphus/evidence/task-25-tests-pass.txt
  ```

  **Commit**: YES

  - Message: `feat(core): add measurement API methods for adapter-to-core updates`
  - Files: `packages/core/src/NodeflowNodeData.ts`, `packages/core/src/NodeConnector.ts`, `packages/core/src/NodeflowData.ts`
  - Pre-commit: `bun test`

- [ ] 26. Split NodeflowLib into NodeflowRegistry (Core) + Adapter Initialization

  **What to do**:

  - Currently, `NodeflowLib` is a singleton that:
    1. Manages a `Map<string, NodeflowData>` of canvases (framework-agnostic — stays in core)
    2. Attaches `document.onmousemove`, `document.onpointerleave`, `document.onpointerup` (DOM — moves to adapter)
    3. Creates a `NodeflowCanvas` component (Solid-specific — moves to adapter)
    4. Has `globalEventStore` for document-level events (framework-agnostic publishers, DOM attachment is adapter)
  - Create `packages/core/src/NodeflowRegistry.ts` (core):
    - Singleton pattern (same as current NodeflowLib.get())
    - `private readonly nodeflows: Map<string, NodeflowData>`
    - `public readonly globalEventStore: DocumentEventRecord` — the event publishers (framework-agnostic)
    - `createCanvas(id: string, ...): NodeflowData` — creates NodeflowData only (no component)
    - `getNodeflow(id)`, `removeNodeflow(id)`, `clear()`, `hasNodeflow(id)`
    - Do NOT attach document event handlers — that's adapter responsibility
    - Do NOT import any component
  - Adapters (Task 29/30) will:
    - Call `NodeflowRegistry.get().createCanvas(id)` to get NodeflowData
    - Attach DOM event handlers to `document` and forward to `globalEventStore`
    - Return framework-specific component
  - Remove `src/utils/NodeflowLib.ts` (replaced by core + adapter)
  - Export `NodeflowRegistry` from `packages/core/src/index.ts`

  **Must NOT do**:

  - Do NOT change the event subscription model
  - Do NOT change how NodeflowData is constructed
  - Do NOT create the adapter pieces here (that's Tasks 29/30)

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Splitting a singleton requires careful analysis of what's framework-agnostic vs framework-specific
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 25, 27-30)
  - **Blocks**: Tasks 29, 30
  - **Blocked By**: Tasks 24, 15

  **References**:

  **Pattern References**:

  - `src/utils/NodeflowLib.ts` — full file (100 lines); line 4: `import NodeflowCanvas` (Solid component — remove); line 6-8: singleton with nodeflows Map + globalEventStore; lines 31-38: `createCanvas` returns `[NodeflowData, NodeflowCanvas(nodeflowData)]` — core only returns NodeflowData; lines 57-64: `document.onmousemove/onpointerleave/onpointerup` handlers — move to adapter; lines 66-98: subscriptions forwarding document events to nodeflows — the subscription logic stays in core as helper, DOM attachment moves to adapter
  - `packages/core/src/EventPublishers.ts` (from Task 15) — DocumentEventPublisher used by globalEventStore

  **WHY Each Reference Matters**:

  - NodeflowLib.ts lines 57-64 show the exact DOM event → EventPublisher bridge that must move to adapters
  - The subscription setup (lines 66-98) shows how document events flow to individual nodeflows — this routing logic can stay in core (it uses EventPublisher, not DOM)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NodeflowRegistry compiles and exports
    Tool: Bash
    Steps:
      1. Run `bun run build` in packages/core/
      2. Grep dist/ for "NodeflowRegistry"
    Expected Result: Build passes, NodeflowRegistry is in dist output
    Evidence: .sisyphus/evidence/task-26-registry-build.txt

  Scenario: NodeflowRegistry has no DOM API calls
    Tool: Bash
    Steps:
      1. Run `grep -E "document\.|window\.|HTMLDivElement|ResizeObserver" packages/core/src/NodeflowRegistry.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-26-no-dom.txt

  Scenario: NodeflowRegistry has no Solid imports
    Tool: Bash
    Steps:
      1. Run `grep -E "solid-js|@solid-primitives" packages/core/src/NodeflowRegistry.ts`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-26-no-solid.txt
  ```

  **Commit**: YES

  - Message: `refactor(core): split NodeflowLib into framework-agnostic NodeflowRegistry`
  - Files: `packages/core/src/NodeflowRegistry.ts`, `packages/core/src/index.ts`
  - Pre-commit: `bun run build`

- [ ] 27. Move screen-utils.ts to @nodeflow/solid

  **What to do**:

  - `src/utils/screen-utils.ts` exports `windowSize` (a Solid signal) and a `createEffect` that listens to window resize
  - Move this file to `packages/solid/src/screen-utils.ts` — it's 100% Solid-specific
  - Update any imports that reference it
  - For `@nodeflow/core`: if any core code needs window dimensions, add a method to NodeflowRegistry or NodeflowData that accepts dimensions as a parameter (adapters provide the value)
  - Check which core files import from screen-utils.ts — these must use the new parameter-based approach instead

  **Must NOT do**:

  - Do NOT create a framework-agnostic window size signal/observable in core
  - Do NOT remove window resize functionality — just move it to the right package

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Small file (19 lines), simple move + import updates
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 25, 26, 28-30)
  - **Blocks**: Task 29
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:

  - `src/utils/screen-utils.ts` — full file (19 lines); line 1: `createEffect, createSignal` from solid-js; line 7: `windowSize` signal; line 14-18: createEffect for window resize listener
  - Grep for `screen-utils` or `windowSize` in all source files to find consumers

  **WHY Each Reference Matters**:

  - Must identify every consumer of windowSize to update their imports or replace with parameter-based approach

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: screen-utils.ts exists in @nodeflow/solid, not in @nodeflow/core
    Tool: Bash
    Steps:
      1. Verify `packages/solid/src/screen-utils.ts` exists
      2. Verify `packages/core/src/screen-utils.ts` does NOT exist
      3. Grep packages/core/src/ for "windowSize" — should be 0 matches
    Expected Result: File in solid package only, no core references
    Evidence: .sisyphus/evidence/task-27-screen-utils.txt
  ```

  **Commit**: YES

  - Message: `refactor(solid): move screen-utils to @nodeflow/solid adapter`
  - Files: `packages/solid/src/screen-utils.ts`
  - Pre-commit: `bun run build`

- [ ] 28. Move CSS to @nodeflow/core Distribution Output

  **What to do**:

  - Locate the existing CSS file: `src/style.css` (or wherever the current stylesheet lives)
  - Copy it to `packages/core/src/style.css` (or `packages/core/styles/`)
  - Configure core's build to include the CSS file in the dist output
  - Update `packages/core/package.json` to expose the CSS file (e.g., `"style": "./dist/style.css"` or exports field)
  - Adapters will import CSS from core: `import '@nodeflow/core/style.css'`
  - Verify the CSS file is included in the build output

  **Must NOT do**:

  - Do NOT modify the CSS content
  - Do NOT introduce CSS modules, CSS-in-JS, Tailwind, or any new styling approach
  - Do NOT change class names or selectors

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Simple file move + build config update
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 25-27, 29, 30)
  - **Blocks**: Tasks 29, 30
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:

  - `src/style.css` — existing CSS file to move (verify path)
  - `packages/core/package.json` (from Task 2) — needs style/exports field for CSS
  - `vite.config.ts` — current build config that may include CSS handling

  **WHY Each Reference Matters**:

  - Must locate the exact CSS file (might be style.css or similar) and understand how it's currently distributed
  - Build config must be updated to include CSS in output

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CSS file in core build output
    Tool: Bash
    Steps:
      1. Run `bun run build` in packages/core/
      2. Verify dist/ contains style.css (or similar)
      3. Verify CSS content is not empty and contains nodeflow class selectors
    Expected Result: CSS file in dist, non-empty, contains expected selectors
    Failure Indicators: No CSS in dist, empty file
    Evidence: .sisyphus/evidence/task-28-css-output.txt

  Scenario: CSS content unchanged from original
    Tool: Bash
    Steps:
      1. Diff original src/style.css with packages/core/dist/style.css
    Expected Result: Content identical (or trivially different due to build processing)
    Evidence: .sisyphus/evidence/task-28-css-diff.txt
  ```

  **Commit**: YES

  - Message: `chore(core): include CSS in @nodeflow/core distribution`
  - Files: `packages/core/src/style.css`, `packages/core/package.json`
  - Pre-commit: `bun run build`

- [ ] 29. Implement @nodeflow/solid Adapter — Move .tsx Components + Bridge State

  **What to do**:

  - Move all 6 component files from `src/components/` to `packages/solid/src/components/`:
    - `NodeflowCanvas.tsx` — main canvas component
    - `NodeflowNode.tsx` — individual node component
    - `NodeCurve.tsx` — connection curve component
    - `Curve.tsx` — SVG curve rendering
    - `SelectionBox.tsx` — selection box overlay
    - `Connector.tsx` — connector dot component
  - Update all imports in component files:
    - Model imports now come from `@nodeflow/core` instead of relative `../utils/data/`
    - Type imports come from `@nodeflow/core` types
  - Create `packages/solid/src/adapter.ts` — the Solid adapter entry point:
    - Import `NodeflowRegistry` from `@nodeflow/core`
    - `createSolidNodeflow(id: string, options?): [NodeflowData, Component]`
      - Calls `NodeflowRegistry.get().createCanvas(id, options)` to get core data
      - Attaches document event handlers (`document.onmousemove`, etc.) — moved from old NodeflowLib
      - Returns `[nodeflowData, NodeflowCanvas(nodeflowData)]` — same API shape as before
    - Export `createSolidNodeflow` (replaces `NodeflowLib.get().createCanvas()`)
  - Create Solid-specific state bridge:
    - Components use `createStore`/`createEffect` to watch core state changes
    - Core emits events via EventEmitter → Solid adapter subscribes and updates Solid signals
    - Components call core measurement API (Task 25) from ResizeObserver callbacks
  - Move `screen-utils.ts` integration here (from Task 27)
  - Update `packages/solid/src/index.ts` to export:
    - `createSolidNodeflow`
    - All component types
    - Re-export core types for convenience
  - Import and apply CSS: `import '@nodeflow/core/style.css'` at adapter entry

  **Must NOT do**:

  - Do NOT change component rendering logic
  - Do NOT change how nodes/connectors are rendered visually
  - Do NOT create a new state management layer — use Solid's existing reactivity to bridge core events

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Complex adapter creation — moving 6 components, creating state bridge, DOM event forwarding, maintaining visual parity
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 25-28, 30)
  - **Blocks**: Task 31
  - **Blocked By**: Tasks 25, 26, 27, 28

  **References**:

  **Pattern References**:

  - `src/components/NodeflowCanvas.tsx` — main canvas; renders nodes, curves, selection box; handles mouse/touch events; writes canvas size to model
  - `src/components/NodeflowNode.tsx` — node rendering; creates ResizeObserver, writes size/offset to model
  - `src/components/NodeCurve.tsx` — renders connection curves between nodes
  - `src/components/Curve.tsx` — SVG path rendering
  - `src/components/SelectionBox.tsx` — selection rectangle overlay
  - `src/components/Connector.tsx` — connector dot; creates ResizeObserver, writes position/size to model
  - `src/utils/NodeflowLib.ts:56-98` — document event handler setup to move into adapter
  - `packages/core/src/NodeflowRegistry.ts` (from Task 26) — the core API the adapter bridges to
  - `packages/core/src/NodeflowNodeData.ts` — `updateMeasurements()` API (from Task 25)
  - `packages/core/src/NodeConnector.ts` — `updateMeasurements()` API (from Task 25)

  **WHY Each Reference Matters**:

  - Each component file shows what DOM events it handles and what model writes it performs — these must be translated to use the new measurement API
  - NodeflowLib.ts lines 56-98 show the exact document event handler code to move into the adapter
  - Core API methods (Tasks 25-26) are what the adapter calls instead of direct model writes

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: @nodeflow/solid builds successfully
    Tool: Bash
    Steps:
      1. Run `bun run build` in packages/solid/
    Expected Result: Build exits 0, dist/ has .js and .d.ts output
    Failure Indicators: Build errors, missing exports
    Evidence: .sisyphus/evidence/task-29-solid-build.txt

  Scenario: No core model imports leak from old paths
    Tool: Bash
    Steps:
      1. Grep packages/solid/src/ for "../utils/data/" or "../../utils/"
    Expected Result: 0 matches — all imports should be from @nodeflow/core
    Failure Indicators: Old relative imports found
    Evidence: .sisyphus/evidence/task-29-no-old-imports.txt

  Scenario: TypeScript compiles with no errors
    Tool: Bash
    Steps:
      1. Run typecheck for packages/solid/
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-29-typecheck.txt
  ```

  **Commit**: YES

  - Message: `feat(solid): implement @nodeflow/solid adapter with all components`
  - Files: `packages/solid/src/components/*.tsx`, `packages/solid/src/adapter.ts`, `packages/solid/src/index.ts`
  - Pre-commit: `bun run build`

- [ ] 30. Implement @nodeflow/vanilla Adapter — Plain DOM Rendering

  **What to do**:

  - Create `packages/vanilla/src/adapter.ts`:
    - `createVanillaNodeflow(id: string, container: HTMLElement, options?): NodeflowData`
    - Calls `NodeflowRegistry.get().createCanvas(id, options)` to get core data
    - Attaches document event handlers (same pattern as Solid adapter)
    - Renders nodes/connections into the provided container using plain DOM manipulation
  - Create vanilla DOM components (plain functions, not framework components):
    - `renderCanvas(container: HTMLElement, data: NodeflowData): void`
    - `renderNode(parent: HTMLElement, node: NodeflowNodeData): HTMLDivElement`
    - `renderConnector(parent: HTMLElement, connector: NodeConnector): HTMLDivElement`
    - `renderCurve(svg: SVGElement, source: NodeConnector, dest: NodeConnector): SVGPathElement`
    - `renderSelectionBox(parent: HTMLElement, data: SelectionBoxData): HTMLDivElement`
  - Import CSS from core: `import '@nodeflow/core/style.css'`
  - Subscribe to core events to update DOM when state changes:
    - Listen for node add/remove → create/remove DOM elements
    - Listen for position changes → update element styles (transform/top/left)
    - Listen for zoom/pan → update canvas transform
  - Handle DOM events:
    - Mouse move/down/up on canvas → call core mouse state API
    - Drag on nodes → call core node movement API
    - Click on connectors → call core connection API
  - Export `createVanillaNodeflow` from `packages/vanilla/src/index.ts`
  - This adapter is PROOF OF CONCEPT — it needs to render nodes, handle basic interactions (drag, connect), but does not need pixel-perfect parity with the Solid version

  **Must NOT do**:

  - Do NOT create a virtual DOM or diff engine
  - Do NOT add any framework dependency
  - Do NOT require 100% feature parity with Solid adapter (POC level is fine)

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Building a DOM adapter from scratch requires understanding both the core API and DOM manipulation patterns
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 25-29)
  - **Blocks**: Task 32
  - **Blocked By**: Tasks 25, 26, 28

  **References**:

  **Pattern References**:

  - `packages/solid/src/adapter.ts` (from Task 29) — the Solid adapter as reference for what the core API surface looks like and how an adapter bridges to it
  - `packages/core/src/NodeflowRegistry.ts` (from Task 26) — entry point for creating canvases
  - `packages/core/src/NodeflowData.ts` (from Task 24) — core API for canvas manipulation
  - `packages/core/src/NodeflowNodeData.ts` (from Task 23) — core API for node manipulation + updateMeasurements
  - `src/components/NodeflowCanvas.tsx` — reference for what DOM structure to create (div structure, CSS classes, SVG for curves)
  - `src/components/NodeflowNode.tsx` — reference for node DOM structure and CSS classes

  **WHY Each Reference Matters**:

  - Solid adapter shows the adapter→core contract; vanilla adapter follows the same contract with DOM instead of Solid
  - Component .tsx files show the expected DOM structure (CSS classes, nesting) that vanilla must replicate

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: @nodeflow/vanilla builds successfully
    Tool: Bash
    Steps:
      1. Run `bun run build` in packages/vanilla/
    Expected Result: Build exits 0, dist/ has .js and .d.ts output
    Evidence: .sisyphus/evidence/task-30-vanilla-build.txt

  Scenario: No framework dependencies in vanilla
    Tool: Bash
    Steps:
      1. Grep packages/vanilla/package.json for "solid\|react\|vue\|svelte\|angular"
      2. Grep packages/vanilla/src/ for "solid-js\|react\|vue\|svelte"
    Expected Result: 0 framework references in both package.json and source
    Evidence: .sisyphus/evidence/task-30-no-framework.txt

  Scenario: Vanilla adapter creates DOM elements
    Tool: Bash
    Steps:
      1. Grep packages/vanilla/src/ for "createElement\|appendChild\|innerHTML\|document\."
      2. Verify DOM manipulation code exists
    Expected Result: DOM API usage found (this IS an adapter — DOM is expected here)
    Evidence: .sisyphus/evidence/task-30-dom-usage.txt
  ```

  **Commit**: YES

  - Message: `feat(vanilla): implement @nodeflow/vanilla adapter with plain DOM rendering`
  - Files: `packages/vanilla/src/adapter.ts`, `packages/vanilla/src/components/*.ts`, `packages/vanilla/src/index.ts`
  - Pre-commit: `bun run build`

- [ ] 31. Migrate Existing Example Apps to @nodeflow/solid

  **What to do**:

  - Update all 3 existing example apps to use `@nodeflow/solid` instead of the old monolithic import:
  - **BlueprintApp** (`examples/BlueprintApp/`):
    - Replace `import { NodeflowLib } from "nodeflow-lib"` → `import { createSolidNodeflow } from "@nodeflow/solid"`
    - Replace `NodeflowLib.get().createCanvas("main")` → `createSolidNodeflow("main")`
    - Update `package.json` dependencies: remove `nodeflow-lib`, add `@nodeflow/solid` (workspace reference)
    - Verify all node creation, connection, serialization code still works with the new API
  - **FamilyTreeApp** (`examples/FamilyTreeApp/`):
    - Same import migration as BlueprintApp
    - Verify custom node content (DisplayFunc) works with generic type
  - **NoStyle** (`examples/NoStyle/`):
    - Same import migration
  - Update example `tsconfig.json` files if needed (path mappings for workspace packages)
  - Verify each example builds and runs

  **Must NOT do**:

  - Do NOT change example app features or styling
  - Do NOT change example app business logic
  - Do NOT add new examples (that's Task 32)

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: 3 example apps to migrate, each needs import updates + dependency changes + build verification
  - **Skills**: [`playwright`]
    - `playwright`: Needed to open each example in browser and verify nodes render correctly

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 32-35)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Task 29

  **References**:

  **Pattern References**:

  - `examples/BlueprintApp/src/App.tsx` — main app file; uses NodeflowLib.get().createCanvas(), addNode, addConnection
  - `examples/FamilyTreeApp/src/App.tsx` — main app file; similar usage + custom DisplayFunc
  - `examples/NoStyle/src/App.tsx` — minimal example
  - `packages/solid/src/index.ts` (from Task 29) — new public API to import from

  **WHY Each Reference Matters**:

  - Each App.tsx shows the exact import and usage patterns that must be updated
  - The new Solid adapter API (createSolidNodeflow) replaces the old NodeflowLib.get().createCanvas() pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: BlueprintApp builds and renders
    Tool: Playwright
    Preconditions: @nodeflow/solid adapter working
    Steps:
      1. Run `bun run build` in examples/BlueprintApp/
      2. Run `bun run dev` in examples/BlueprintApp/
      3. Navigate to http://localhost:5173 (or whatever port)
      4. Wait for canvas to render (selector: "[class*='nodeflow']" or similar)
      5. Assert at least one node element is visible
      6. Take screenshot
    Expected Result: Canvas renders with nodes visible
    Failure Indicators: Build fails, blank page, no nodes rendered
    Evidence: .sisyphus/evidence/task-31-blueprint-screenshot.png

  Scenario: FamilyTreeApp builds and renders
    Tool: Playwright
    Steps:
      1. Run `bun run build` in examples/FamilyTreeApp/
      2. Run `bun run dev`, navigate, verify canvas renders with nodes
      3. Take screenshot
    Expected Result: Canvas with family tree nodes visible
    Evidence: .sisyphus/evidence/task-31-familytree-screenshot.png

  Scenario: NoStyle example builds
    Tool: Bash
    Steps:
      1. Run `bun run build` in examples/NoStyle/
    Expected Result: Build exits 0
    Evidence: .sisyphus/evidence/task-31-nostyle-build.txt
  ```

  **Commit**: YES

  - Message: `refactor(examples): migrate existing examples to @nodeflow/solid`
  - Files: `examples/BlueprintApp/`, `examples/FamilyTreeApp/`, `examples/NoStyle/`
  - Pre-commit: `bun run build`

- [ ] 32. Create Vanilla JS Example App

  **What to do**:

  - Create `examples/VanillaApp/` with:
    - `package.json` — depends on `@nodeflow/vanilla` (workspace reference)
    - `index.html` — simple HTML page with a container div
    - `src/main.ts` — creates a vanilla nodeflow canvas, adds a few nodes, connects them
    - `vite.config.ts` — simple vite config for vanilla TS
    - `tsconfig.json`
  - The example should demonstrate:
    - Creating a canvas in a container div
    - Adding 2-3 nodes with positions
    - Connecting nodes
    - Verifying nodes render and are visible
  - This is a PROOF OF CONCEPT — it doesn't need to match the complexity of BlueprintApp

  **Must NOT do**:

  - Do NOT use any framework (SolidJS, React, Vue, etc.)
  - Do NOT make it overly complex — 2-3 nodes + 1 connection is sufficient

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: New example app creation from scratch + Playwright verification
  - **Skills**: [`playwright`]
    - `playwright`: Verify vanilla DOM rendering in browser

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 31, 33-35)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Task 30

  **References**:

  **Pattern References**:

  - `examples/BlueprintApp/` — directory structure reference for example app layout
  - `packages/vanilla/src/index.ts` (from Task 30) — API to use: `createVanillaNodeflow(id, container, options)`
  - `packages/core/src/NodeflowData.ts` — `addNode()`, `addConnection()` API

  **WHY Each Reference Matters**:

  - BlueprintApp shows the expected example directory structure (package.json, vite config, src/App)
  - Vanilla adapter API defines how the example creates and uses the nodeflow canvas

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: VanillaApp builds and renders nodes
    Tool: Playwright
    Preconditions: @nodeflow/vanilla adapter working
    Steps:
      1. Run `bun run build` in examples/VanillaApp/
      2. Run `bun run dev` in examples/VanillaApp/
      3. Navigate to http://localhost:5173 (or whatever port)
      4. Wait for container div to have child elements
      5. Assert at least 2 node elements exist in DOM
      6. Take screenshot
    Expected Result: Nodes visible in canvas container
    Failure Indicators: Build fails, empty container, no nodes
    Evidence: .sisyphus/evidence/task-32-vanilla-screenshot.png

  Scenario: VanillaApp has no framework dependencies
    Tool: Bash
    Steps:
      1. Grep examples/VanillaApp/package.json for "solid\|react\|vue\|svelte\|angular"
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-32-no-framework.txt
  ```

  **Commit**: YES

  - Message: `feat(examples): add vanilla JS example app`
  - Files: `examples/VanillaApp/`
  - Pre-commit: `bun run build`

- [ ] 33. Core Isolation Verification — Zero Framework Imports Check

  **What to do**:

  - Comprehensive automated verification that `@nodeflow/core` has zero framework dependencies:
  - **Source check**:
    - Grep ALL files in `packages/core/src/` for: `solid-js`, `@solid-primitives`, `ReactiveMap`, `createStore`, `createSignal`, `createEffect`, `produce`, `JSX`
    - Assert 0 matches
  - **Build output check**:
    - Grep ALL files in `packages/core/dist/` for same patterns
    - Assert 0 matches
  - **DOM API check**:
    - Grep `packages/core/src/` for: `document.`, `window.` (excluding type-only usage), `HTMLDivElement`, `HTMLElement`, `ResizeObserver`, `addEventListener`
    - Assert 0 matches (or only in type declarations that are adapter-facing)
  - **Package.json check**:
    - Verify `packages/core/package.json` has no solid-js, @solid-primitives in dependencies or peerDependencies
  - **TypeScript check**:
    - Run `bun run typecheck` on packages/core
    - Assert 0 errors

  **Must NOT do**:

  - Do NOT modify any files — this is verification only

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Pure verification task — run grep commands and check results
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 31, 32, 34, 35)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Task 24

  **References**:

  **Pattern References**:

  - `packages/core/src/` — all core source files
  - `packages/core/dist/` — all core build output
  - `packages/core/package.json` — dependencies section

  **WHY Each Reference Matters**:

  - These are the exact locations to verify for framework isolation — the core success criterion

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero Solid imports in core source
    Tool: Bash
    Steps:
      1. Run `grep -r "solid-js\|@solid-primitives\|ReactiveMap\|createStore\|createSignal\|createEffect\|produce" packages/core/src/`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-33-no-solid-source.txt

  Scenario: Zero Solid imports in core dist
    Tool: Bash
    Steps:
      1. Run `grep -r "solid-js\|@solid-primitives\|ReactiveMap\|createStore" packages/core/dist/`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-33-no-solid-dist.txt

  Scenario: Zero DOM API usage in core
    Tool: Bash
    Steps:
      1. Run `grep -rn "document\.\|window\.\|HTMLDivElement\|HTMLElement\|ResizeObserver\|addEventListener" packages/core/src/`
      2. Filter out type-only declarations if any
    Expected Result: 0 runtime DOM API calls
    Evidence: .sisyphus/evidence/task-33-no-dom.txt

  Scenario: Core package.json clean
    Tool: Bash
    Steps:
      1. Run `grep -E "solid|@solid-primitives" packages/core/package.json`
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-33-package-clean.txt
  ```

  **Commit**: NO (verification only — no file changes)

- [ ] 34. Remove Old Single-Package Structure + Cleanup

  **What to do**:

  - Remove the old `src/` directory (all files have been moved to packages/):
    - `src/components/` — moved to packages/solid/src/components/
    - `src/utils/data/` — moved to packages/core/src/
    - `src/utils/SelectionMap.ts` — moved to packages/core/src/
    - `src/utils/screen-utils.ts` — moved to packages/solid/src/
    - `src/utils/NodeflowLib.ts` — replaced by packages/core/src/NodeflowRegistry.ts
    - `src/nodeflow-types/` — moved to packages/core/src/types.ts
    - `src/index.ts` — replaced by packages/\*/src/index.ts
    - `src/style.css` — moved to packages/core/
  - Remove old root-level build artifacts:
    - Old `dist/` directory (if any)
    - Old `vite.config.ts` (replaced by per-package configs)
  - Clean up root `package.json`:
    - Remove `main`, `module`, `types`, `exports` fields (packages handle their own)
    - Keep workspace config, monorepo scripts, devDependencies shared across packages
  - Verify `bun install` still resolves all workspace packages
  - Run full test suite and build

  **Must NOT do**:

  - Do NOT delete `examples/` directory
  - Do NOT delete `.sisyphus/` directory
  - Do NOT delete `pnpm-lock.yaml` if it wasn't already deleted in Task 1

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: File deletions and package.json cleanup — straightforward
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Tasks 31, 32, 33, 35)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Tasks 31, 32, 33

  **References**:

  **Pattern References**:

  - `src/` — entire old source directory to remove
  - `package.json` — root package.json to clean up (remove single-package fields)
  - `vite.config.ts` — old build config to remove

  **WHY Each Reference Matters**:

  - Must know exactly what's in src/ to verify everything was already moved before deleting
  - Root package.json needs cleanup to reflect monorepo structure

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Old src/ directory removed
    Tool: Bash
    Steps:
      1. Verify `src/` directory does not exist
      2. Run `bun install` — verify workspace resolution still works
    Expected Result: src/ gone, workspaces resolve
    Evidence: .sisyphus/evidence/task-34-src-removed.txt

  Scenario: Full build still passes after cleanup
    Tool: Bash
    Steps:
      1. Run `bun run build` (all packages)
      2. Run `bun test` (all tests)
    Expected Result: All builds and tests pass
    Failure Indicators: Missing files, broken imports
    Evidence: .sisyphus/evidence/task-34-full-build.txt
  ```

  **Commit**: YES

  - Message: `chore: remove old single-package structure and clean up root`
  - Files: `src/` (deleted), `package.json`, `vite.config.ts` (deleted)
  - Pre-commit: `bun test; bun run build`

- [ ] 35. Verify solid-styled-components Usage + Remove if Stale

  **What to do**:

  - `solid-styled-components` is listed as a peerDependency in the current `package.json`
  - Check if it's actually imported/used ANYWHERE in the source code:
    - Grep entire codebase for `solid-styled-components`, `styled(`, `css\`` (tagged template literals from styled-components)
  - If NOT used:
    - Remove from `package.json` peerDependencies
    - Remove from any package's dependencies
    - Confirm build still passes
  - If USED:
    - Move usage to `@nodeflow/solid` package (it's Solid-specific)
    - Add to `packages/solid/package.json` peerDependencies
    - Remove from root `package.json`

  **Must NOT do**:

  - Do NOT rewrite styled-components usage into another CSS approach
  - If it IS used, just move it — don't refactor

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Simple investigation + possible removal or move
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 31-34)
  - **Blocks**: Task 34
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:

  - `package.json` — `"solid-styled-components": "^0.28.5"` in peerDependencies
  - Entire `src/` (or now `packages/*/src/`) — grep for usage

  **WHY Each Reference Matters**:

  - Metis flagged this as potentially stale — need to verify before cleanup

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Determine if solid-styled-components is used
    Tool: Bash
    Steps:
      1. Grep entire codebase for "solid-styled-components\|styled(\|css\`"
      2. Document findings
    Expected Result: Clear determination: USED or NOT USED
    Evidence: .sisyphus/evidence/task-35-styled-check.txt

  Scenario: Build passes after removal/move
    Tool: Bash
    Steps:
      1. Run `bun run build` after changes
      2. Run `bun test`
    Expected Result: All builds and tests pass
    Evidence: .sisyphus/evidence/task-35-build-after.txt
  ```

  **Commit**: YES

  - Message: `chore: remove stale solid-styled-components dependency` (or `chore(solid): move solid-styled-components to @nodeflow/solid`)
  - Files: `package.json` (and optionally `packages/solid/package.json`)
  - Pre-commit: `bun run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` across all packages + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check for Solid imports leaking into @nodeflow/core. Verify no AI slop: excessive comments, over-abstraction, generic names.
      Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
      Start from clean state. Build all packages. Build all example apps. Open BlueprintApp in browser: verify canvas renders, nodes display, drag a node, create a connection, undo, redo, zoom, pan. Test VanillaApp similarly. Save screenshots to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual changes. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect scope creep: plugin systems added, CSS redesigned, business logic refactored, React/Vue/Svelte adapters created. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Scope Creep [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

Each task specifies its own commit message and files. General pattern:

- **Test tasks**: `test(core): add {ModelClass} behavioral tests`
- **Scaffold tasks**: `chore: {description}`
- **Model refactor tasks**: `refactor(core): remove Solid from {ModelClass}`
- **Adapter tasks**: `feat({adapter}): implement {adapter} adapter`
- **Example tasks**: `refactor(examples): migrate to @nodeflow/{adapter}`
- Pre-commit check: `bun test` must pass before every commit

---

## Success Criteria

### Verification Commands

```bash
bun test                          # Expected: all tests pass, 0 failures
bun run build                     # Expected: all packages build successfully
bun run typecheck                 # Expected: 0 TypeScript errors
# Core isolation check:
grep -r "solid-js\|@solid-primitives" packages/core/dist/ # Expected: 0 matches
grep -r "document\.\|window\.\|ResizeObserver" packages/core/src/ # Expected: 0 matches (excluding type-only usage)
# Example builds:
cd examples/BlueprintApp && bun run build   # Expected: 0 errors
cd examples/FamilyTreeApp && bun run build  # Expected: 0 errors
cd examples/NoStyle && bun run build        # Expected: 0 errors
cd examples/VanillaApp && bun run build     # Expected: 0 errors
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] @nodeflow/core has zero framework dependencies
- [ ] @nodeflow/core has zero DOM API calls
- [ ] All example apps build and run
- [ ] Playwright smoke test passes on at least one example
