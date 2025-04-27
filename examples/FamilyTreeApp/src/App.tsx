import { type Component, onMount } from "solid-js";
import {
  getWindowSize,
  NodeConnector,
  NodeflowData,
  NodeflowLib,
  onWindowResize,
} from "nodeflow-lib";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";
import Sidebar from "./components/Sidebar";
import SidebarContent from "./components/SidebarContent";
import { FamilyTreeConstants } from "./Constants";
import { FTCurveFunctions } from "./FTCurveFunctions";
import FamilyMember from "../FamilyMember";

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

  const nodeflowDivRef = Nodeflow({
    css: { getNewCurveCss, nodeflow: nodeflowCss.nodeflow },
    width: `${getWindowSize().x}px`,
    height: `${getWindowSize().y}px`,
  });

  onWindowResize((size) => {
    if (!nodeflowDivRef) return;
    nodeflowDivRef.style.width = `${size.x}px`;
    nodeflowDivRef.style.height = `${size.y}px`;
  });

  return (
    <>
      {nodeflowDivRef}
      <Sidebar>
        <SidebarContent />
      </Sidebar>
    </>
  );
};

export { nodeflowData };
export default App;
