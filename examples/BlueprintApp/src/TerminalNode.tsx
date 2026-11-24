import { Component, createMemo, For } from "solid-js";
import { Changes, NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision, markBlueprintDirty } from "./reactivity";
import nodeCss from "./styles/node.module.scss";
import contentCss from "./styles/content.module.scss";

const stop = (event: Event) => event.stopPropagation();

/**
 * A side of the derived type being edited: the "Inputs" terminal sits left and
 * offers one output per input port, the "Outputs" terminal sits right and
 * takes one input per output port. Ports can be added and removed freely;
 * unused ones are dropped when the type is saved.
 */
const TerminalNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const isInputs = () => props.node.customData.side !== "outputs";
  // Inputs offer their ports as outputs, and vice versa.
  const sectionId = () => (isInputs() ? "outputs" : "inputs");

  const portIds = createMemo(() => {
    blueprintRevision();
    return Array.from(
      props.node.connectorSections.get(sectionId())?.connectors.keys() ?? [],
    );
  });

  const addPort = () => {
    const section = props.node.connectorSections.get(sectionId());
    if (!section) return;
    section.addConnector({
      id: `port-${section.connectors.size}`,
      css: isInputs() ? nodeCss.outputConnector : nodeCss.inputConnector,
    });
    markBlueprintDirty();
  };

  /** Removes the last port and its wires as one undo step. */
  const removePort = () => {
    const section = props.node.connectorSections.get(sectionId());
    const lastId = portIds().at(-1);
    if (!section || lastId === undefined) return;

    const nodeflow = props.node.nodeflow;
    const historyGroup = Changes.createHistoryGroup();
    const wires = isInputs()
      ? props.node.getAllDestinationConnections()
      : props.node.getAllSourceConnections();

    wires
      .filter((wire) =>
        isInputs()
          ? wire.sourceConnectorId === lastId
          : wire.destinationConnectorId === lastId,
      )
      .forEach((wire) =>
        nodeflow.removeConnection(
          wire.sourceNodeId,
          wire.sourceConnectorId,
          wire.destinationNodeId,
          wire.destinationConnectorId,
          historyGroup,
        ),
      );
    section.removeConnector(lastId, historyGroup);
    markBlueprintDirty();
  };

  return (
    <div class={contentCss.terminalRoot}>
      <div class={contentCss.terminalHeader}>
        <span class={contentCss.label}>
          {isInputs() ? "Inputs" : "Outputs"}
        </span>
        <div class={contentCss.terminalButtons}>
          <button
            type="button"
            class={contentCss.terminalButton}
            title="Remove the last port"
            aria-label="Remove the last port"
            disabled={portIds().length === 0}
            onPointerDown={stop}
            onMouseDown={stop}
            onClick={removePort}
          >
            −
          </button>
          <button
            type="button"
            class={contentCss.terminalButton}
            title="Add a port"
            aria-label="Add a port"
            onPointerDown={stop}
            onMouseDown={stop}
            onClick={addPort}
          >
            +
          </button>
        </div>
      </div>
      <ul
        class={contentCss.terminalPorts}
        classList={{ [contentCss.terminalPortsRight]: isInputs() }}
      >
        <For each={portIds()}>
          {(_id, index) => (
            <li>
              {isInputs() ? "in" : "out"} {index() + 1}
            </li>
          )}
        </For>
      </ul>
    </div>
  );
};

export default TerminalNode;
