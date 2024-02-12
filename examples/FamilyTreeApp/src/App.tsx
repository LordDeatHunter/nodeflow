import { type Component, createMemo, onMount } from "solid-js";
import { NodeflowData, NodeflowLib, windowSize } from "nodeflow-lib";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";
import Sidebar from "./components/Sidebar";
import SidebarContent from "./components/SidebarContent";
import { FamilyTreeConstants } from "./Constants";
import { FTCurveFunctions } from "./FTCurveFunctions";

const App: Component = () => {
  const [nodeflowData, Nodeflow] = NodeflowLib.get().createCanvas(
    FamilyTreeConstants.MAIN_NODEFLOW,
    {},
    (nf: NodeflowData) => new FTCurveFunctions(nf),
  );

  onMount(() => {
    setupEvents(nodeflowData);
    setupDummyNodes(nodeflowData).then(() =>
      setupDummyConnections(nodeflowData),
    );
  });

  const newCurveCss = createMemo(() => {
    const node = nodeflowData.mouseData.heldNodes;
    const connector = nodeflowData.mouseData.heldConnector;

    if (!node || !connector) {
      return undefined;
    }

    return node.customData.gender === "M"
      ? curveCss.newFatherCurve
      : curveCss.newMotherCurve;
  });

  return (
    <>
      <Nodeflow
        css={{ newCurve: newCurveCss(), nodeflow: nodeflowCss.nodeflow }}
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
