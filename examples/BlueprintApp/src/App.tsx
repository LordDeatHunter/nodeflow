import { type Component, createSignal, onMount, Show } from "solid-js";
import {
  createSolidNodeflow,
  NodeflowData,
  NodeflowRegistry,
  Optional,
  Vec2,
} from "@nodeflow-lib/solid";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import appCss from "./styles/app.module.scss";
import NewNodeSlot from "./NewNodeSlot";
import {
  createBlueprintNode,
  NodeType,
  setupDemoGraph,
  setupEvents,
} from "./utils";
import { BPCurveFunctions } from "./BPCurveFunctions";

const [nodeflowData, Nodeflow] = createSolidNodeflow(
  "main",
  { defaultLineShape: "broken-elbow" },
  (nodeflow: NodeflowData) => new BPCurveFunctions(nodeflow),
);

const PREVIEW_LABELS: Record<NodeType, string> = {
  number: "Number node",
  operation: "Sum node",
  display: "Display node",
};

const App: Component = () => {
  const [nodePreview, setNodePreview] =
    createSignal<Optional<NodeType>>(undefined);
  const [cursor, setCursor] = createSignal(Vec2.of(0, 0));

  const startPreview = (type: NodeType, event: PointerEvent) => {
    setCursor(Vec2.of(event.clientX, event.clientY));
    setNodePreview(type);
  };

  const createNode = (data: { event: PointerEvent }) => {
    const type = nodePreview();
    if (!type) return;

    setNodePreview(undefined);

    const clickPos = Vec2.fromEvent(data.event);
    const nodeflowPosition = nodeflowData.startPosition;
    const nodeflowSize = nodeflowData.size;

    if (!clickPos.isWithinRect(nodeflowPosition, nodeflowSize)) return;

    const nodePosition = clickPos
      .subtract(nodeflowPosition)
      .divideBy(nodeflowData.zoomLevel)
      .subtract(nodeflowData.position);

    createBlueprintNode(type, nodePosition, true);
  };

  onMount(() => {
    setupEvents();
    setupDemoGraph();

    NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.subscribe(
      "blueprint:track-cursor",
      ({ event }) => setCursor(Vec2.of(event.clientX, event.clientY)),
    );

    NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.subscribe(
      "create-node",
      createNode,
    );
  });

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
      </div>
      <div class={appCss.hotbar}>
        <div class={appCss.hotbarHeader}>
          <h1 class={appCss.hotbarTitle}>Node palette</h1>
          <p class={appCss.hotbarHint}>Drag a node onto the canvas to add it</p>
        </div>
        <div class={appCss.slots}>
          <NewNodeSlot onClick={(event) => startPreview("number", event)}>
            Number node
          </NewNodeSlot>
          <NewNodeSlot onClick={(event) => startPreview("operation", event)}>
            Sum node
          </NewNodeSlot>
          <NewNodeSlot onClick={(event) => startPreview("display", event)}>
            Display node
          </NewNodeSlot>
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
          {PREVIEW_LABELS[nodePreview()!]}
        </div>
      </Show>
    </div>
  );
};

export { nodeflowData };
export default App;
