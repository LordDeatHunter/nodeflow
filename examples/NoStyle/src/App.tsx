import { type Component, onMount } from "solid-js";
import { NodeflowLib, windowSize } from "nodeflow-lib";
import { setupDummyConnections, setupDummyNodes } from "./utils";

const [nodeflowData, Nodeflow] = NodeflowLib.get().createCanvas("main");

const App: Component = () => {
  onMount(() => {
    setupDummyNodes();
    setupDummyConnections();
  });

  return (
    <div
      style={{
        width: `${windowSize().x}px`,
        height: `${windowSize().y}px`,
      }}
    >
      <Nodeflow height="100%" width="100%" />
    </div>
  );
};

export { nodeflowData };
export default App;
