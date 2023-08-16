import { type Component } from "solid-js";

import Drawflow from "./components/Drawflow";
import {
  addConnection,
  addInput,
  addNode,
  addOutput,
  getNode,
} from "./utils/NodeStorage";

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const newNode = addNode(Math.random() * 2000, Math.random() * 2000);
    const inputs = 2 + Math.floor(Math.random() * 4);
    const outputs = 2 + Math.floor(Math.random() * 4);
    for (let k = 0; k < inputs; k++) addInput(newNode!.nodeId);
    for (let k = 0; k < outputs; k++) addOutput(newNode!.nodeId);
  }
}

for (let i = 0; i < 25; i++) {
  const from = Math.floor(Math.random() * 25);
  const to = Math.floor(Math.random() * 25);
  const fromNode = getNode(from.toString());
  const toNode = getNode(to.toString());
  if (!fromNode || !toNode) continue;
  const fromOutputs = Object.keys(fromNode.outputs.get()).length;
  const toInputs = Object.keys(toNode.inputs.get()).length;
  const fromOutput = Math.floor(Math.random() * fromOutputs);
  const toInput = Math.floor(Math.random() * toInputs);
  addConnection(
    from.toString(),
    fromOutput.toString(),
    to.toString(),
    toInput.toString()
  );
}

const App: Component = () => {
  return <Drawflow />;
};

export default App;
