import { type Component, createSignal, JSX, onMount, Show } from "solid-js";
import {
  Drawflow,
  drawflow,
  drawflowEventStore,
  Optional,
  Vec2,
  windowSize,
} from "nodeflow-lib";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/node.module.scss";
import drawflowCss from "./styles/drawflow.module.scss";
import {
  createDummyNode,
  setupDummyConnections,
  setupDummyNodes,
  setupEvents,
} from "./utils";

const App: Component = () => {
  const [nodePreview, setNodePreview] =
    createSignal<Optional<JSX.Element>>(undefined);

  const createNode = (data: { event: PointerEvent }) => {
    if (!nodePreview()) return;

    setNodePreview(undefined);

    const clickPos = Vec2.fromEvent(data.event);
    const drawflowPosition = drawflow.startPosition;
    const drawflowSize = drawflow.size;

    if (!clickPos.isWithinRect(drawflowPosition, drawflowSize)) return;

    const nodePosition = clickPos
      .subtract(drawflowPosition)
      .divideBy(drawflow.zoomLevel)
      .subtract(drawflow.position);

    createDummyNode(nodePosition, true);
  };

  onMount(() => {
    setupEvents();
    setupDummyNodes();
    setupDummyConnections();

    drawflowEventStore.onPointerUpInDocument.subscribe(
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
      <Drawflow
        css={{
          newCurve: curveCss.newConnection,
          drawflow: drawflowCss.drawflow,
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
            left: `${drawflow.mouseData.mousePosition.x - 75}px`,
            top: `${drawflow.mouseData.mousePosition.y - 45}px`,
            width: "150px",
            height: "90px",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "z-index": 1000,
          }}
          class={nodeCss.node}
        >
          {nodePreview()}
        </div>
      </Show>
    </div>
  );
};

export default App;
