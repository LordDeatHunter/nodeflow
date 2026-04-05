<script lang="ts">
  import { Nodeflow, createNodeDisplay } from "@nodeflow/svelte";
  import type { NodeflowData } from "@nodeflow/svelte";
  import NodeCard from "./NodeCard.svelte";

  const nodeDisplay = createNodeDisplay(NodeCard, (node) => ({
    id: node.id,
    position: node.position,
  }));

  let nodeflowData: NodeflowData | undefined = $state(undefined);

  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const addNode = (data: NodeflowData, x: number, y: number, inputs: number, outputs: number) => {
    const node = data.addNode({
      position: { x, y },
      display: nodeDisplay,
    });

    if (inputs > 0) {
      const section = node.addConnectorSection({ id: "inputs" });
      for (let i = 0; i < inputs; i++) {
        section.addConnector({ id: `in-${i}` });
      }
    }

    if (outputs > 0) {
      const section = node.addConnectorSection({ id: "outputs" });
      for (let i = 0; i < outputs; i++) {
        section.addConnector({ id: `out-${i}` });
      }
    }

    return node;
  };

  const handleReady = (data: NodeflowData) => {
    nodeflowData = data;

    const start = addNode(data, 80, 100, 0, 2);
    const config = addNode(data, 80, 300, 0, 1);

    const transform = addNode(data, 380, 60, 2, 1);
    const validate = addNode(data, 380, 260, 2, 1);
    const merge = addNode(data, 380, 460, 1, 1);

    const output = addNode(data, 700, 160, 2, 1);
    const logger = addNode(data, 700, 400, 2, 0);

    const connect = (
      srcId: string,
      srcConnector: string,
      dstId: string,
      dstConnector: string,
    ) => {
      data.addConnection({
        sourceNodeId: srcId,
        sourceConnectorId: srcConnector,
        destinationNodeId: dstId,
        destinationConnectorId: dstConnector,
      });
    };

    connect(start.id, "out-0", transform.id, "in-0");
    connect(start.id, "out-1", validate.id, "in-0");
    connect(config.id, "out-0", validate.id, "in-1");
    connect(transform.id, "out-0", output.id, "in-0");
    connect(validate.id, "out-0", output.id, "in-1");
    connect(merge.id, "out-0", logger.id, "in-0");
    connect(output.id, "out-0", logger.id, "in-1");
  };

  const addRandomNode = () => {
    if (!nodeflowData) return;
    addNode(
      nodeflowData,
      randInt(50, 800),
      randInt(50, 600),
      randInt(0, 3),
      randInt(0, 3),
    );
  };

  const addRandomConnection = () => {
    if (!nodeflowData) return;
    const data = nodeflowData;
    const nodeIds = Array.from(data.nodes.keys());
    if (nodeIds.length < 2) return;

    for (let attempt = 0; attempt < 20; attempt++) {
      const srcId = nodeIds[randInt(0, nodeIds.length - 1)];
      const dstId = nodeIds[randInt(0, nodeIds.length - 1)];
      if (srcId === dstId) continue;

      const srcNode = data.nodes.get(srcId)!;
      const dstNode = data.nodes.get(dstId)!;

      const srcOutputs = srcNode.getAllConnectors().filter(
        (c) => c.parentSection.id === "outputs",
      );
      const dstInputs = dstNode.getAllConnectors().filter(
        (c) => c.parentSection.id === "inputs",
      );
      if (srcOutputs.length === 0 || dstInputs.length === 0) continue;

      const srcConn = srcOutputs[randInt(0, srcOutputs.length - 1)];
      const dstConn = dstInputs[randInt(0, dstInputs.length - 1)];

      data.addConnection({
        sourceNodeId: srcId,
        sourceConnectorId: srcConn.id,
        destinationNodeId: dstId,
        destinationConnectorId: dstConn.id,
      });
      break;
    }
  };
</script>

<div class="toolbar">
  <button onclick={addRandomNode}>Add Random Node</button>
  <button onclick={addRandomConnection}>Add Random Connection</button>
</div>
<Nodeflow id="main" onready={handleReady} />
