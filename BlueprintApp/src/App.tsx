import { type Component, onMount } from "solid-js";
import Drawflow from "solid-drawflow/src/components/Drawflow";
import curveCss from "./styles/curve.module.scss";
import { setupDummyConnections, setupDummyNodes, setupEvents } from "./utils";

const App: Component = () => {
  onMount(() => {
    setupEvents();
    setupDummyNodes();
    setupDummyConnections();
  });
  return <Drawflow css={{ newCurve: curveCss.newConnection }} />;
};

export default App;
