import {
  type Component,
  createMemo,
  createSignal,
  JSX,
  onMount,
  Show,
} from "solid-js";
import {
  createSolidNodeflow,
  createTick,
  NodeflowData,
  NodeflowRegistry,
  Optional,
  Vec2,
  windowSize,
} from "@nodeflow/solid";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/node.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import {
  createDummyNode,
  setupDummyConnections,
  setupDummyNodes,
  setupEvents,
} from "./utils";
import { BPCurveFunctions } from "./BPCurveFunctions";

const [nodeflowData, Nodeflow] = createSolidNodeflow(
  "main",
  {},
  (nodeflow: NodeflowData) => new BPCurveFunctions(nodeflow),
);

const App: Component = () => {
  const tick = createTick();
  const [nodePreview, setNodePreview] =
    createSignal<Optional<JSX.Element>>(undefined);

  const mousePos = createMemo(() => {
    tick();
    return nodeflowData.mouseData.mousePosition;
  });

  const createNode = (data: { event: PointerEvent }) => {
    if (!nodePreview()) return;

    setNodePreview(undefined);

    const clickPos = Vec2.fromEvent(data.event);
    const nodeflowPosition = nodeflowData.startPosition;
    const nodeflowSize = nodeflowData.size;

    if (!clickPos.isWithinRect(nodeflowPosition, nodeflowSize)) return;

    const nodePosition = clickPos
      .subtract(nodeflowPosition)
      .divideBy(nodeflowData.zoomLevel)
      .subtract(nodeflowData.position);

    createDummyNode(nodePosition, true);
  };

  onMount(() => {
    setupEvents();
    setupDummyNodes();
    setupDummyConnections();

    NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.subscribe(
      "create-node",
      createNode,
    );
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column-reverse",
        width: `${windowSize().x}px`,
        height: `${windowSize().y}px`,
      }}
    >
      <Nodeflow
        css={{
          getNewCurveCss: () => curveCss.newConnection,
          nodeflow: nodeflowCss.nodeflow,
        }}
        height="100%"
        width="100%"
      />
      <div
        style={{
          width: "100%",
          "min-height": "300px",
          "background-color": "gray",
          opacity: "0.5",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          gap: "20px",
        }}
      >
        <div
          class={nodeCss.node}
          style={{
            width: "150px",
            height: "90px",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "user-select": "none",
            cursor: "grab",
          }}
          onPointerDown={() => {
            setNodePreview("Generic node");
          }}
        >
          Generic node
        </div>
      </div>
      <Show when={nodePreview()}>
        <div
          style={{
            position: "absolute",
            left: `${mousePos().x - 75}px`,
            top: `${mousePos().y - 45}px`,
            width: "150px",
            height: "90px",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "z-index": 1000,
            "user-select": "none",
            cursor: "grabbing",
          }}
          class={nodeCss.node}
        >
          {nodePreview()}
        </div>
      </Show>
    </div>
  );
};

export { nodeflowData };
export default App;
