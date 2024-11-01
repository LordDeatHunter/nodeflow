import { type Component, createSignal, JSX, onMount, Show } from "solid-js";
import {
  NodeflowData,
  NodeflowLib,
  Optional,
  Vec2,
  windowSize,
} from "nodeflow-lib";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/node.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import { createNewNode, setupEvents } from "./utils";
import { BPCurveFunctions } from "./BPCurveFunctions";
import DisplayNode from "./DisplayNode";
import NumberNode from "./NumberNode";
import SumNode from "./SumNode";
import NewNodeSlot from "./components/NewNodeSlot";
import OutputData from "./OutputData";

const [nodeflowData, Nodeflow] = NodeflowLib.get().createCanvas(
  "main",
  {
    createConnectorData: (data) => {
      const origin = data.customData?.origin;
      return !origin
        ? undefined
        : new OutputData(origin, data.customData?.storedData?.value);
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
        createNewNode(nodePosition, true, SumNode, 2, 1);
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
        <NewNodeSlot onClick={() => setNodePreview("display")}>
          Display node
        </NewNodeSlot>
        <NewNodeSlot onClick={() => setNodePreview("number")}>
          Number node
        </NewNodeSlot>
        <NewNodeSlot onClick={() => setNodePreview("operation")}>
          Sum node
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
        >
          {nodePreview()}
        </div>
      </Show>
    </div>
  );
};

export { nodeflowData };
export default App;
