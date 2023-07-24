import { type Component } from "solid-js";

import Drawflow from "./components/Drawflow";
import {
  addConnection,
  addInput,
  addNode,
  addOutput,
} from "./utils/NodeStorage";

for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    const newNode = addNode(20 + i * 150, 20 + j * 150);
    addInput(newNode!.nodeId);
    addInput(newNode!.nodeId);
    addOutput(newNode!.nodeId);
    addOutput(newNode!.nodeId);
  }
}
addConnection("1", "0", "2", "0");
addConnection("3", "0", "5", "0");
addConnection("3", "1", "4", "0");
addConnection("4", "0", "1", "0");
addConnection("5", "1", "2", "1");

const App: Component = () => {
  return <Drawflow />;
};

export default App;
