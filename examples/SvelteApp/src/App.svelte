<script lang="ts">
  import { Nodeflow } from "@nodeflow/svelte";
  import type { NodeflowData } from "@nodeflow/svelte";
  import { mount } from "svelte";
  import NodeCard from "./NodeCard.svelte";

  const nodeDisplay = ({ node }: { node: { id: string; position: { x: number; y: number } } }): HTMLElement => {
    const container = document.createElement("div");
    mount(NodeCard, {
      target: container,
      props: { id: node.id, position: node.position },
    });

    return container;
  };

  const handleReady = (nodeflowData: NodeflowData) => {
    const addNode = (x: number, y: number, inputs: number, outputs: number) => {
      const node = nodeflowData.addNode({
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

    const start = addNode(80, 100, 0, 2);
    const config = addNode(80, 300, 0, 1);

    const transform = addNode(380, 60, 2, 1);
    const validate = addNode(380, 260, 2, 1);
    const merge = addNode(380, 460, 1, 1);

    const output = addNode(700, 160, 2, 1);
    const logger = addNode(700, 400, 2, 0);

    const connect = (
      srcId: string,
      srcConnector: string,
      dstId: string,
      dstConnector: string,
    ) => {
      nodeflowData.addConnection({
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
</script>

<Nodeflow id="main" onready={handleReady} />
