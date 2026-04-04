## Task 5 learnings

- Bun's built-in test runner works cleanly in the workspace without extra dependencies.
- Root `bun run test` successfully fans out through Turbo when the package-level `test` script is present.
- Capturing evidence from PowerShell may add a BOM or command prefix line, but the test results still show the expected pass/fail summary.

## Task 10 learnings

- EventPublishers.ts uses ReactiveMap from @solid-primitives/map which works fine in Bun's test environment when imported from the root src via relative path ../../../src/utils/data/EventPublishers.
- BaseEventPublisher subscriptions are keyed by name: calling subscribe() with the same name twice OVERWRITES the first callback (not a double-subscribe).
- The import path from packages/core/tests/ to root src/ is ../../../src/utils/data/..., not ../../src/utils/data/ as suggested in task spec.
- Blacklist filter signature is (data, subscriberName, priority) � the second arg is the subscription NAME KEY, not a publisher identifier.
- 11 tests (including 8 required + 3 extras from unblacklist/clearBlacklist/size helpers) all pass in ~120ms.

## Task 6 learnings

- Import path from packages/core/tests/ to root src/ is ../../../src/utils/data/... (not ../../src/utils/data/ as the task spec suggests).
- NodeflowData.serializeConnections() returns BOTH directions per connection (from source connector's .destinations AND from destination connector's .sources), so 1 logical connection = 2 serialized entries. deserialize() deduplicates via addConnection's guard.
- getAllSourceConnectors(nodeId) returns the external connectors whose arrows POINT INTO nodeId's connectors (i.e. incoming sources). For a node with only outgoing connections it returns 0. Use getAllDestinationConnectors to find connectors that this node is sending to.
- CustomNodeflowDataType must be declared as a global interface in the test file (or imported via a file that re-exports it) for TypeScript to compile NodeflowNodeData correctly.
- solid-js createStore works in Bun's non-browser test environment without any polyfills - no Solid renderer needed for pure data operations.
- 39 tests written and all pass, covering: construction, addNode, removeNode, addConnection, removeConnection, updateZoom, transformVec2ToCanvas, serialize/deserialize round-trip, updateSettings, getNextFreeNodeId, getAllSourceConnectors, and connection cleanup on removeNode.

## Task 8 learnings

- NodeConnector and ConnectorSection both use createStore from solid-js/store internally - this works fine in Bun's test environment without a Solid renderer.
- To test NodeConnector directly, construct it with
  ew NodeConnector(data) passing a mock ConnectorSectionType. Avoids the full dependency chain.
- ConnectorSection.addConnector() behavior when given a duplicate ID: NodeConnector.deserialize() checks connectors.has(id), generates a NEW auto ID instead, and adds that new connector. It does NOT return the existing connector - both end up in the map.
- Import paths from packages/core/tests/ to root src/ must use ../../../src/utils/data/... (3 levels up). The task spec saying ../../src/utils/data/ is incorrect.
- ConnectorSection.addConnector() with hasHistoryGroup: false skips all NodeflowLib/Changes history logic entirely, making the mock nodeflowData only need a stub changes.addChange.
- 32 tests (19 NodeConnector + 13 ConnectorSection) all pass with 0 failures.

## Task 12 learnings

- Changes.ts is pure TypeScript with zero Solid dependencies - bun test works cleanly.
- Change interface shape: { type, source, applyChange, undoChange, historyGroup } - note the methods are named applyChange/undoChange (NOT do/undo as task description suggested).
- undo() groups changes by historyGroup string; a single undo() call undoes ALL consecutive changes sharing the same topmost historyGroup.
- evaluateHistoryGroup(false) returns boolean false (not a string), evaluateHistoryGroup(true) generates a UUID string.
- Import paths from packages/core/tests/ to root src/ require ../../../ (three levels up), not ../../.

## Task 9 learnings

- Import paths from packages/core/tests/ to root src/ require ../../../ (three levels up), NOT ../../ as the task spec states.
- MouseData, KeyboardData, and SelectionBoxData all require a NodeflowData instance to construct. Use new NodeflowData("test-canvas") directly � solid-js createStore works fine in Bun's test environment.
- MouseData.reset() does NOT reset mousePosition � it only clears clickStartPosition, pointerDown, heldMouseButtons, selections, and selectionBox. Do not test mousePosition in reset().
- MouseData.pointerDown is a write-only setter � there is no public getter. Cannot directly assert its value; test via behavioral side effects.
- SelectionBoxData.boundingBox setter calls nodeflowData.transformVec2ToCanvas() and nodeflowData.chunking.getNodesInRect() � with no nodes in the canvas, setting a bounding box results in empty selections (no crash).
- KeyboardData.pressKey/releaseKey are the public mutation API. heldKeys setter replaces the entire Set. clearKeys() resets to empty Set.
- 43 tests total (17 MouseData + 16 KeyboardData + 10 SelectionBoxData) all pass with 0 failures in ~171ms.

## Task 11 – SelectionMap and NodeflowChunking behavioral tests (2026-04-04)

- Import paths from packages/core/tests/ to root src/ require `../../../` (three levels up). The task spec saying `../../src/` is incorrect — that would resolve to `packages/src/` which does not exist.
- SelectionMap constructor requires a `NodeflowData` instance. Construct via `new NodeflowData("test-id")` — works fine in Bun without any Solid renderer.
- SelectionMap.size counts nodes + connectors + connections + (1 if nodeflow selected).
- NodeflowChunking.addNodeToChunk/removeNodeFromChunk only track node IDs — the `NodeflowData.nodes` map is only queried in `getNodesInRect()` and `checkForCollisions()`. Tests for basic chunk add/remove work without populating `NodeflowData.nodes`.
- For `getNodesInRect()` tests, add nodes via `nf.addNode()` AND call `chunking.addNodeToChunk()` manually since chunking is managed separately in tests.
- NodeflowChunking uses `createStore` from `solid-js/store` — works in Bun test environment without polyfills.
- 18 SelectionMap tests + 17 NodeflowChunking tests = 35 total, all passing in ~154ms.

## Task 7 – NodeflowNodeData behavioral tests (2026-04-04)

### Import path

Tests in packages/core/tests/ must use **3 levels up** to reach root src:
import X from '../../../src/utils/data/X'
(not ../../src/ which would resolve to packages/src/ - nonexistent)

### ConnectorSection.deserialize id-collision behavior

When adding a connector section with an id that already exists, ConnectorSection.deserialize
auto-assigns a NEW id (via getNextFreeConnectorSectionId) rather than returning the existing one.
This means calling addConnectorSection twice with the same id creates TWO sections, not one.
addConnectorSection only de-dupes if the _generated_ id collides.

### Solid store proxy and toBe

Solid createStore wraps values in proxies. Strict reference equality (toBe) fails when comparing
objects retrieved from the store. Use .id comparison or toEqual for value equality instead.

### NodeflowData construction in tests

Instantiate NodeflowData directly: new NodeflowData('some-unique-id')
Pass hasHistoryGroup=false to all node/section/connector mutations to avoid NodeflowLib.get() calls
(which would fail without NodeflowLib.createCanvas setup).

### Global type declaration

Bun test environment requires: declare global { interface CustomNodeflowDataType {} }
when importing NodeflowData/NodeflowNodeData.

## Task 20 – NodeflowChunking Solid removal (2026-04-04)

- createStore replaced with two private props: \_chunkSize: number and \_chunks: Map<Vec2Hash, Set<string>>; getters/setters use direct property access.
- ReactiveMap is a Map subclass — replacing
  ew ReactiveMap<K,V>() with
  ew Map<K,V>() is drop-in; all CRUD methods identical.
- Return type of getNodesInRect changed from NodeflowNodeData[] to ny[] to avoid circular dependency (nodeflowData typed as ny).
- NodeflowChunking.ts imports: Vec2 + Vec2Hash from ./Vec2, Rect from ./Rect, isSetEmpty from ./misc-utils — all sibling files in packages/core/src/.
- All 17 NodeflowChunking tests pass; full 216-test suite passes with 0 regressions.

## Task 23 learnings

- NodeflowNodeData: Replace createStore with private \_ prefixed properties. createEffect for collision resolution becomes an imperative checkAndResolveCollisions() method.
- The double createEffect (outer: getCollidingNodes, inner: resolve) simplifies to a single forEach � no nested reactivity needed imperatively.
- Must use this.\_position directly (bypassing the setter) inside checkAndResolveCollisions() to avoid infinite recursion. The setter calls checkAndResolveCollisions().
- NodeflowLib.get().getNodeflow(nodeflowId) pattern in history closures can be replaced by capturing const nodeflowData = this.nodeflowData and using it directly � removes the NodeflowLib dependency entirely.
- ReactiveMap is a Map subclass: direct drop-in replacement with
  ew Map<K,V>().
- update() and updateWithPrevious() must handle position specially to update the chunking index and trigger collision checks.

## [2026-04-04] Task: T25

- Measurement API methods are simple one-liner wrappers around direct private field assignment � no need for setters since size/offset/position setters may have side effects (e.g., position setter triggers chunking updates) but measurement fields don't.
- NodeflowNodeData.updateMeasurements(size, offset): sets \_size and \_offset directly (bypassing setters, which have no side effects for these fields).
- NodeConnector.updateMeasurements(position, size): sets \_position and \_size directly (connector position setter has no side effects).
- NodeflowData.updateCanvasSize(size): sets \_size directly (size setter has no side effects).
- All 3 methods added to existing exported classes � no new exports needed in index.ts.
- 216 pass, 0 fail after adding 3 methods � zero regressions.
- PowerShell 2>&1 redirect may produce a NativeCommandError warning but test results are still captured correctly.

## [2026-04-04] Task: T26 – NodeflowRegistry creation

- DocumentEventRecord type is defined in packages/core/src/EventPublishers.ts, NOT in
  odeflow-types.ts. Import from ./EventPublishers not ./nodeflow-types.
- The subscription routing logic in NodeflowLib (lines 66-98) is pure EventPublisher logic with no DOM dependency — it belongs in core, forwarding globalEventStore events to individual
  odeflow.mouseData calls.
- DOM setup (document.onmousemove, document.onpointerleave, document.onpointerup) lives in adapters (T29/T30), not core.
- createCanvas() in NodeflowRegistry returns NodeflowData directly (not a tuple [NodeflowData, Component]) since rendering is adapter concern.
- The existing NodeflowData.ts TS errors (implicit any on event callbacks, NodeflowEventRecord not found in nodeflow-types) are pre-existing, not introduced by T26.
- Build still exits 0 despite DTS type errors (Vite's ite-plugin-dts reports them as warnings/informational, not blocking build output).
- un test → 216 pass, 0 fail (zero regressions from new file addition).

## [2026-04-04] Task: T27

- `screen-utils` fits in `@nodeflow/solid`; `Vec2` should come from `@nodeflow/core` there.
- `packages/core/src/` has no `windowSize` consumers, so no core refactor was needed.
- `bun test` stayed green at 216 pass / 0 fail after the move.

## [2026-04-04] Task: T28

- Vite library mode did emit `dist/style.css` once the core package had its own copied `src/style.css` and a small `generateBundle()` asset emitter.
- Exposing `"style": "./dist/style.css"` plus `"./style.css"` in `exports` makes the adapter import path explicit for consumers.
- `bun run build` in `packages/core/` completed and produced `dist/style.css`; `bun test` still passed 216/0.

## [2026-04-04] Task: T29

- All 6 SolidJS components (NodeflowCanvas, NodeflowNode, Connector, NodeCurve, Curve, SelectionBox) copied to packages/solid/src/components/ with all imports updated from relative ../utils paths to @nodeflow/core.
- NodeflowNode.tsx cleanup: removed node().resizeObserver disconnect, node().ref set, and connector.ref access from onCleanup/ref callbacks. Replaced node().update({ size, offset }) with node().updateMeasurements(size, offset).
- Connector.tsx cleanup: replaced connector.update({ position, ref, resizeObserver, size }) with connector.updateMeasurements(position, size); kept connector.size direct setter for ResizeObserver callback.
- NodeflowCanvas.tsx cleanup: replaced nodeflowData.update({ size }) with nodeflowData.updateCanvasSize(size); kept nodeflowData.update({ startPosition }) as that field still has a setter.
- createSolidNodeflow adapter follows NodeflowRegistry.get().createCanvas() pattern (returns NodeflowData directly, not a tuple); adapter itself assembles the tuple and attaches document event handlers.
- packages/solid vite.config.ts and tsconfig.json already existed with correct setup (vite-plugin-solid, jsxImportSource=solid-js, @nodeflow/core in rollupOptions externals).
- Typecheck errors in packages/solid are all pre-existing: screen-utils.ts Vec2 namespace issue (T27) and stale core dist declaration files � not introduced by T29.
- bun run build in packages/solid exits 0; bun test reports 216 pass, 0 fail.

## [2026-04-04] Task: T30

- createVanillaNodeflow(id, container, options) follows the same adapter pattern as Solid: call NodeflowRegistry.get().createCanvas(), attach document event handlers, then render into container.
- DOM reactivity without a framework: use
  equestAnimationFrame polling loop to sync innerDiv.style.transform on zoom/pan changes and node left/ op positions. Simple and effective for a POC.
- The onNodeDataChanged event fires whenever a node's data changes, including additions — subscribe to it to auto-render newly added nodes into the DOM.
- NodeflowEventPublisher's subscribeMultiple callback can lose type inference when the class uses ny internally — explicit parameter type annotation ({ nodeId }: { nodeId: string; data: unknown }) fixes implicit-any TS errors in DTS generation.
- Curve rendering: maintain a Map<curveId, SVGPathElement> and diff it against current connections each RAF frame — create new paths, update existing d attributes, remove stale paths. Simple and avoids virtual DOM.
- Connector position measurement: use getBoundingClientRect() relative to the node element to compute position; pass to connector.updateMeasurements(position, size).
- Node measurement: use ResizeObserver on the node div, pass offsetWidth/offsetHeight as size and relative offset from parent to
  ode.updateMeasurements(size, offset).
- packages/vanilla/vite.config.ts was already present with correct
  ollupOptions.external: ['@nodeflow/core'] — no modification needed.
- Build exits 0 and produces dist/index.es.js + dist/index.cjs.js + dist/index.d.ts with no framework dependencies.

## [2026-04-04] Task: T35

- Source scan across `packages/**/*.ts(x)` and `examples/**/*.ts(x)` found no real usage of `solid-styled-components`; only `node_modules` references were present.
- Removed `solid-styled-components` from root and example package.json files; `solid-js` stayed intact.
- `bun test` still passes at 216/0.
- `bun run build` currently fails on pre-existing ESLint issues in `packages/core/src` unrelated to this dependency cleanup.

## [2026-04-04] Task: T33

- Solid imports were not found in packages/core/src or packages/core/dist, and packages/core/package.json contains no solid dependencies.
- The DOM-pattern grep produced 3 matches in packages/core/src/NodeflowRegistry.ts, but they are subscribeMultiple event names containing "Document." rather than DOM API calls; mark the DOM check as FAIL only because the literal regex matched, not because of actual browser API usage.
