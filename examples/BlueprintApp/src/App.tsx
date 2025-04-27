import { type Component, createSignal, JSX, onMount, Show } from "solid-js";
import {
  getWindowSize,
  NodeflowData,
  NodeflowLib,
  onWindowResize,
  Optional,
  Vec2,
} from "nodeflow-lib";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/node.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import { createNewNode, setupEvents } from "./utils";
import { BPCurveFunctions } from "./BPCurveFunctions";
import DisplayNode, { DisplayNodeData } from "./DisplayNode";
import NumberNode, { NumberNodeData } from "./NumberNode";
import OperationNode, { OperationNodeData, Operator } from "./OperationNode";
import NewNodeSlot from "./components/NewNodeSlot";
import NumberConnector from "./data/NumberConnector";
import AnyConnector from "./data/AnyConnector";

const [nodeflowData, Nodeflow] = NodeflowLib.get().createCanvas(
  "main",
  {
    createNodeData: (data) => {
      switch (data.customData?.type) {
        case "number":
          return new NumberNodeData(data.customData!.value as number);
        case "operation":
          return new OperationNodeData(data.customData!.value as Operator);
        default:
          return new DisplayNodeData();
      }
    },
    createConnectorData: (data) => {
      switch (data.customData?.type) {
        case "number":
          return new NumberConnector(
            data.customData?.value as Optional<number>,
          );
        default:
          return new AnyConnector();
      }
    },
  },
  (nodeflow: NodeflowData) => new BPCurveFunctions(nodeflow),
);

const App: Component = () => {
  const [nodePreview, setNodePreview] =
    createSignal<Optional<JSX.Element>>(undefined);

  const createNode = (data: { event: PointerEvent }) => {
    if (!nodePreview()) return;

    const type = nodePreview();
    setNodePreview(undefined);

    const clickPos = Vec2.fromEvent(data.event);
    const nodeflowPosition = nodeflowData.startPosition;
    const nodeflowSize = nodeflowData.size;

    console.log(clickPos, nodeflowPosition, nodeflowSize);
    if (!clickPos.isWithinRect(nodeflowPosition, nodeflowSize)) return;

    const nodePosition = clickPos
      .subtract(nodeflowPosition)
      .divideBy(nodeflowData.zoomLevel)
      .subtract(nodeflowData.position);

    switch (type) {
      case "display":
        createNewNode(nodePosition, true, DisplayNode, 1, 0);
        break;
      case "number":
        createNewNode(nodePosition, true, NumberNode, 0, 1);
        break;
      case "operation":
        createNewNode(nodePosition, true, OperationNode, 2, 1);
        break;
    }
  };

  onMount(() => {
    setupEvents();

    NodeflowLib.get().globalEventStore.onPointerUpInDocument.subscribe(
      "create-node",
      createNode,
    );
  });

  let nodeflowDivRef: HTMLDivElement | undefined;
  let dragNodeRef: HTMLDivElement | undefined;

  onWindowResize((size) => {
    if (!nodeflowDivRef) return;
    nodeflowDivRef.style.width = `${size.x}px`;
    nodeflowDivRef.style.height = `${size.y}px`;
  });

  nodeflowData.eventStore.onMousePositionChanged.subscribe(
    "nodeflow-mouse-move",
    ({ position }) => {
      if (!dragNodeRef) return;
      dragNodeRef.style.left = `${position.x - 75}px`;
      dragNodeRef.style.top = `${position.y - 45}px`;
    },
  );

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column-reverse",
        width: `${getWindowSize().x}px`,
        height: `${getWindowSize().y}px`,
      }}
      ref={nodeflowDivRef}
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
          "z-index": 10,
          width: "100%",
          "min-height": "300px",
          "background-color": "#38485C61",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          gap: "20px",
        }}
      >
        <NewNodeSlot onClick={() => setNodePreview("number")}>
          Number node
        </NewNodeSlot>
        <NewNodeSlot onClick={() => setNodePreview("operation")}>
          Sum node
        </NewNodeSlot>
        <NewNodeSlot onClick={() => setNodePreview("display")}>
          Display node
        </NewNodeSlot>
      </div>
      <Show when={nodePreview()}>
        <div
          style={{
            position: "absolute",
            left: `${nodeflowData.mouseData.mousePosition.x - 75}px`,
            top: `${nodeflowData.mouseData.mousePosition.y - 45}px`,
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
          ref={dragNodeRef}
        >
          {nodePreview()}
        </div>
      </Show>
    </div>
  );
};

export { nodeflowData };
export default App;
