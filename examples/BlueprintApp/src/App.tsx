import {
  type Component,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  createSolidNodeflow,
  NodeflowData,
  NodeflowRegistry,
  NodeTemplate,
  Optional,
  Vec2,
} from "@nodeflow-lib/solid";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import appCss from "./styles/app.module.scss";
import NewNodeSlot from "./NewNodeSlot";
import {
  createBlueprintNode,
  createDerivedNode,
  groupNodes,
  NodeType,
  resolveNodeDisplay,
  setupDemoGraph,
  setupEvents,
  setupSavedTypePersistence,
  spawnSavedType,
} from "./utils";
import { BPCurveFunctions } from "./BPCurveFunctions";

// Matches the 24px minor dot grid in nodeflow.module.scss (major lines are
// every 5 cells).
const GRID_SIZE = 24;

const [nodeflowData, Nodeflow] = createSolidNodeflow(
  "main",
  {
    defaultLineShape: "broken-elbow",
    gridSize: GRID_SIZE,
    snapNodePositionToGrid: true,
    snapNodeSizeToGrid: true,
    groupPadding: GRID_SIZE,
    groupHeaderHeight: 36,
    resolveNodeDisplay: (node) => resolveNodeDisplay(node),
  },
  (nodeflow: NodeflowData) => new BPCurveFunctions(nodeflow),
);

const PREVIEW_LABELS: Record<NodeType, string> = {
  number: "Number node",
  operation: "Sum node",
  display: "Display node",
};

type Preview =
  | { kind: "node"; type: NodeType }
  | { kind: "saved"; templateId: string; name: string };

const sameIds = (prev: Array<string>, next: Array<string>) =>
  prev.length === next.length && prev.every((id, i) => id === next[i]);

const App: Component = () => {
  const [nodePreview, setNodePreview] =
    createSignal<Optional<Preview>>(undefined);
  const [cursor, setCursor] = createSignal(Vec2.of(0, 0));
  const [savedTypes, setSavedTypes] = createSignal<Array<NodeTemplate>>([]);
  const [selectedIds, setSelectedIds] = createSignal<Array<string>>([], {
    equals: sameIds,
  });

  const startPreview = (preview: Preview, event: PointerEvent) => {
    setCursor(Vec2.of(event.clientX, event.clientY));
    setNodePreview(preview);
  };

  const createNode = (data: { event: PointerEvent }) => {
    const preview = nodePreview();
    if (!preview) return;

    setNodePreview(undefined);

    const clickPos = Vec2.fromEvent(data.event);
    const nodeflowPosition = nodeflowData.startPosition;
    const nodeflowSize = nodeflowData.size;

    if (!clickPos.isWithinRect(nodeflowPosition, nodeflowSize)) return;

    const nodePosition = clickPos
      .subtract(nodeflowPosition)
      .divideBy(nodeflowData.zoomLevel)
      .subtract(nodeflowData.position);

    if (preview.kind === "node") {
      createBlueprintNode(preview.type, nodePosition, true);
    } else {
      spawnSavedType(preview.templateId, nodePosition, true);
    }
  };

  // The group every selected node is in, if they all share one.
  const selectedGroupId = createMemo(() => {
    const ids = selectedIds();
    const groupIds = new Set(
      ids.map((id) => nodeflowData.getGroupOfNode(id)?.id),
    );
    const [groupId] = groupIds;
    return ids.length > 0 && groupIds.size === 1 ? groupId : undefined;
  });

  onMount(() => {
    setupEvents();
    setupSavedTypePersistence();
    setupDemoGraph();
    onCleanup(syncBackgroundGrid());

    setSavedTypes(nodeflowData.templates.list());
    nodeflowData.eventStore.onTemplatesChanged.subscribe(
      "blueprint:palette",
      ({ templates }) => setSavedTypes([...templates]),
    );

    nodeflowData.eventStore.onContentChanged.subscribe(
      "blueprint:track-selection",
      () =>
        setSelectedIds(nodeflowData.mouseData.heldNodes.map((node) => node.id)),
    );

    NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.subscribe(
      "blueprint:track-cursor",
      ({ event }) => setCursor(Vec2.of(event.clientX, event.clientY)),
    );

    NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.subscribe(
      "create-node",
      createNode,
    );
  });

  const previewLabel = () => {
    const preview = nodePreview();
    if (!preview) return "";
    return preview.kind === "node" ? PREVIEW_LABELS[preview.type] : preview.name;
  };

  return (
    <div class={appCss.app}>
      <div class={appCss.viewport}>
        <Nodeflow
          css={{
            getNewCurveCss: () => curveCss.newConnection,
            nodeflow: nodeflowCss.nodeflow,
          }}
          height="100%"
          width="100%"
        />
        <Show when={selectedIds().length > 0}>
          <div class={appCss.selectionToolbar}>
            <span class={appCss.selectionCount}>
              {selectedIds().length} selected
            </span>
            <button
              type="button"
              class={appCss.toolbarButton}
              onClick={() => createDerivedNode(selectedIds())}
            >
              Create derived node
            </button>
            <Show
              when={selectedGroupId()}
              fallback={
                <button
                  type="button"
                  class={appCss.toolbarButton}
                  onClick={() => groupNodes(selectedIds())}
                >
                  Group
                </button>
              }
            >
              {(groupId) => (
                <button
                  type="button"
                  class={appCss.toolbarButton}
                  onClick={() => nodeflowData.removeGroup(groupId())}
                >
                  Ungroup
                </button>
              )}
            </Show>
          </div>
        </Show>
      </div>
      <div class={appCss.hotbar}>
        <div class={appCss.hotbarHeader}>
          <h1 class={appCss.hotbarTitle}>Node palette</h1>
          <p class={appCss.hotbarHint}>
            Drag a node onto the canvas to add it. Select nodes to group them
            or turn them into a derived node.
          </p>
        </div>
        <div class={appCss.slots}>
          <NewNodeSlot
            onClick={(event) =>
              startPreview({ kind: "node", type: "number" }, event)
            }
          >
            Number node
          </NewNodeSlot>
          <NewNodeSlot
            onClick={(event) =>
              startPreview({ kind: "node", type: "operation" }, event)
            }
          >
            Sum node
          </NewNodeSlot>
          <NewNodeSlot
            onClick={(event) =>
              startPreview({ kind: "node", type: "display" }, event)
            }
          >
            Display node
          </NewNodeSlot>
          <For each={savedTypes()}>
            {(template) => (
              <NewNodeSlot
                saved
                onClick={(event) =>
                  startPreview(
                    {
                      kind: "saved",
                      templateId: template.id,
                      name: template.name,
                    },
                    event,
                  )
                }
                onRemove={() => nodeflowData.templates.remove(template.id)}
              >
                {template.name}
              </NewNodeSlot>
            )}
          </For>
        </div>
      </div>
      <Show when={nodePreview()}>
        <div
          class={appCss.previewCard}
          style={{
            left: `${cursor().x - 75}px`,
            top: `${cursor().y - 45}px`,
          }}
        >
          {previewLabel()}
        </div>
      </Show>
    </div>
  );
};

/**
 * Keeps the canvas background grid aligned with the panned/zoomed canvas, so
 * snapped nodes sit on the drawn grid. Reads where the transformed layer's
 * origin (canvas-space 0,0) lands on screen each frame and exposes it, plus
 * the zoom level, as CSS variables used by nodeflow.module.scss.
 */
const syncBackgroundGrid = (): (() => void) => {
  let frame = 0;
  let lastKey = "";

  const sync = () => {
    frame = requestAnimationFrame(sync);

    const canvas = document.getElementById(`nodeflow-${nodeflowData.id}`);
    const layer = canvas?.firstElementChild;
    if (!canvas || !layer) return;

    const canvasRect = canvas.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const x = layerRect.left - canvasRect.left - canvas.clientLeft;
    const y = layerRect.top - canvasRect.top - canvas.clientTop;
    const scale = nodeflowData.zoomLevel;

    const key = `${x}:${y}:${scale}`;
    if (key === lastKey) return;
    lastKey = key;

    canvas.style.setProperty("--grid-x", `${x}px`);
    canvas.style.setProperty("--grid-y", `${y}px`);
    canvas.style.setProperty("--grid-scale", `${scale}`);
  };

  frame = requestAnimationFrame(sync);
  return () => cancelAnimationFrame(frame);
};

export { nodeflowData };
export default App;
