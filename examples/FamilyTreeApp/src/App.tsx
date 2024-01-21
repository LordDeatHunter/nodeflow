import { type Component, createMemo, onMount } from "solid-js";
import Drawflow from "nodeflow/src/components/Drawflow";
import curveCss from "./styles/curve.module.scss";
import drawflowCss from "./styles/drawflow.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";
import Sidebar from "./components/Sidebar";
import SidebarContent from "./components/SidebarContent";
import { drawflow, windowSize } from "nodeflow/src";

const App: Component = () => {
  onMount(() => {
    setupEvents();
    setupDummyNodes().then(() => setupDummyConnections());
  });

  const newCurveCss = createMemo(() => {
    const nodeId = drawflow.mouseData.heldNodeId;

    if (
      !nodeId ||
      !drawflow.mouseData.heldConnectorId ||
      !drawflow.nodes.has(nodeId)
    ) {
      return undefined;
    }
    const heldNode = drawflow.nodes.get(nodeId)!;

    return heldNode.customData.gender === "M"
      ? curveCss.newFatherCurve
      : curveCss.newMotherCurve;
  });

  return (
    <>
      <Drawflow
        css={{ newCurve: newCurveCss(), drawflow: drawflowCss.drawflow }}
        width={`${windowSize().x}px`}
        height={`${windowSize().y}px`}
      />
      <Sidebar>
        <SidebarContent />
      </Sidebar>
    </>
  );
};

export default App;