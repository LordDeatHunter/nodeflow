import { createVanillaNodeflow } from "@nodeflow/vanilla";

const container = document.getElementById("app")!;

const nodeflowData = createVanillaNodeflow("main", container);

const node1 = nodeflowData.addNode({ position: { x: 120, y: 150 } });
const outputSection = node1.addConnectorSection({ id: "output" });
outputSection.addConnector({ id: "out-1" });

const node2 = nodeflowData.addNode({ position: { x: 460, y: 150 } });
const inputSection = node2.addConnectorSection({ id: "input" });
inputSection.addConnector({ id: "in-1" });

nodeflowData.addNode({ position: { x: 290, y: 350 } });

nodeflowData.addConnection({
  sourceNodeId: node1.id,
  sourceConnectorId: "out-1",
  destinationNodeId: node2.id,
  destinationConnectorId: "in-1",
});
