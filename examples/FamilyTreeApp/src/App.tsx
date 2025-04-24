import { type Component, createSignal, onMount } from "solid-js";
import { NodeConnector, NodeflowData, NodeflowLib } from "nodeflow-lib";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";
import Sidebar from "./components/Sidebar";
import SidebarContent from "./components/SidebarContent";
import { FamilyTreeConstants } from "./Constants";
import { FTCurveFunctions } from "./FTCurveFunctions";
import FamilyMember from "../FamilyMember";
import { getWindowSize, onWindowResize, Vec2 } from "../../../src";

const [windowSize, setWindowSize] = createSignal<Vec2>(getWindowSize());
onWindowResize(() => {
  setWindowSize(getWindowSize());
});

const [nodeflowData, Nodeflow] = NodeflowLib.get().createCanvas(
  FamilyTreeConstants.MAIN_NODEFLOW,
  {
    createNodeData: (data) =>
      new FamilyMember(data.customData!.gender, data.customData!.name),
  },
  (nf: NodeflowData) => new FTCurveFunctions(nf),
);

const App: Component = () => {
  onMount(() => {
    setupEvents();
    setupDummyNodes().then(() => setupDummyConnections());
  });

  const getNewCurveCss = (heldConnector?: NodeConnector) => {
    if (!heldConnector) {
      return undefined;
    }

    return (heldConnector.parentNode.customData as FamilyMember).gender === "M"
      ? curveCss.newFatherCurve
      : curveCss.newMotherCurve;
  };

  return (
    <>
      <Nodeflow
        css={{ getNewCurveCss, nodeflow: nodeflowCss.nodeflow }}
        width={`${windowSize().x}px`}
        height={`${windowSize().y}px`}
      />
      <Sidebar>
        <SidebarContent />
      </Sidebar>
    </>
  );
};

export { nodeflowData };
export default App;
