import { type Component, onMount } from "solid-js";
import { createSolidNodeflow } from "@nodeflow/solid";
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
        width: "100%",
        height: "100dvh",
      }}
    >
      <Nodeflow height="100%" width="100%" />
    </div>
  );
};

export { nodeflowData };
export default App;
