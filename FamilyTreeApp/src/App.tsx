import { type Component, createMemo, onMount } from "solid-js";
import Drawflow from "solid-drawflow/src/components/Drawflow";
import curveCss from "./styles/curve.module.scss";
import drawflowCss from "./styles/drawflow.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";
import Sidebar from "./components/Sidebar";
import SidebarContent from "./components/SidebarContent";
import { mouseData, nodes, windowSize } from "solid-drawflow/src";

const App: Component = () => {
  onMount(() => {
    setupEvents();
    setupDummyNodes().then(() => setupDummyConnections());
  });

  const newCurveCss = createMemo(() => {
    if (!mouseData.heldNodeId || !mouseData.heldConnectorId) return undefined;

    const heldNode = nodes[mouseData.heldNodeId];
    if (!heldNode) return undefined;

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
