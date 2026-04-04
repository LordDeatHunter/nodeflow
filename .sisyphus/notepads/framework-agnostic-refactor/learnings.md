## Task 5 learnings

- Bun's built-in test runner works cleanly in the workspace without extra dependencies.
- Root `bun run test` successfully fans out through Turbo when the package-level `test` script is present.
- Capturing evidence from PowerShell may add a BOM or command prefix line, but the test results still show the expected pass/fail summary.

## Task 10 learnings

- EventPublishers.ts uses ReactiveMap from @solid-primitives/map which works fine in Bun's test environment when imported from the root src via relative path ../../../src/utils/data/EventPublishers.
- BaseEventPublisher subscriptions are keyed by name: calling subscribe() with the same name twice OVERWRITES the first callback (not a double-subscribe).
- The import path from packages/core/tests/ to root src/ is ../../../src/utils/data/..., not ../../src/utils/data/ as suggested in task spec.
- Blacklist filter signature is (data, subscriberName, priority) — the second arg is the subscription NAME KEY, not a publisher identifier.
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
