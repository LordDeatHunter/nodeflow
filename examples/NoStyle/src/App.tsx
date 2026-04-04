import { type Component, onMount } from "solid-js";
import { createSolidNodeflow, windowSize } from "@nodeflow/solid";
import { setupDummyConnections, setupDummyNodes } from "./utils";

const [nodeflowData, Nodeflow] = createSolidNodeflow("main");

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
