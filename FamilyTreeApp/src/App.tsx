import { type Component, onMount } from "solid-js";
import Drawflow from "solid-drawflow/src/components/Drawflow";
import drawflowCss from "./styles/drawflow.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";
import Sidebar from "./components/Sidebar";
import SidebarContent from "./components/SidebarContent";

const App: Component = () => {
  onMount(() => {
    setupEvents();
    setupDummyNodes().then(() => setupDummyConnections());
  });

  return (
    <>
      <Drawflow css={{ newCurve: drawflowCss["new-curve"] }} />
      <Sidebar>
        <SidebarContent />
      </Sidebar>
    </>
  );
};

export default App;
