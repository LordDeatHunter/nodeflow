import { Component, createMemo, For, Show } from "solid-js";
import { CompositePort, NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision, markBlueprintDirty } from "./reactivity";
import { formatValue, getOutputValue } from "./values";
import { breakApartDerivedNode, saveDerivedNodeType } from "./utils";
import contentCss from "./styles/content.module.scss";

const stop = (event: Event) => event.stopPropagation();

/** What a port connects to inside, e.g. "Sum · in 2". */
const describePort = (
  node: NodeflowNodeData,
  port: CompositePort,
  direction: "in" | "out",
): string => {
  const inner = node.composite?.nodes[port.innerNodeId]?.customData;
  const index = Number(port.innerConnectorId.split("-").at(-1)) + 1;
  const kind =
    inner?.type === "operation"
      ? `Op ${inner.operator ?? "+"}`
      : inner?.type === "derived"
        ? (inner.name ?? "Derived")
        : inner?.type === "number"
          ? "Number"
          : "Display";
  return `${kind} · ${direction} ${index}`;
};

const DerivedNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const name = createMemo(() => {
    blueprintRevision();
    return props.node.customData.name ?? "Derived node";
  });

  const ports = createMemo(() => {
    blueprintRevision();
    return {
      inputs: props.node.composite?.inputs ?? [],
      outputs: props.node.composite?.outputs ?? [],
    };
  });

  const isSaved = createMemo(() => {
    blueprintRevision();
    const id = props.node.customData.templateId;
    return id !== undefined && props.node.nodeflow.templates.has(id);
  });

  const rename = (value: string) => {
    props.node.customData = { ...props.node.customData, name: value };
    markBlueprintDirty();
  };

  return (
    <div class={contentCss.derivedRoot}>
      <input
        class={contentCss.derivedName}
        value={name()}
        aria-label="Derived node name"
        onInput={(event) => rename(event.currentTarget.value)}
        onKeyDown={stop}
        onPointerDown={stop}
        onMouseDown={stop}
      />
      <div class={contentCss.derivedPorts}>
        <ul class={contentCss.portList}>
          <For each={ports().inputs}>
            {(port) => <li>{describePort(props.node, port, "in")}</li>}
          </For>
        </ul>
        <ul class={`${contentCss.portList} ${contentCss.portListOutputs}`}>
          <For each={ports().outputs}>
            {(port) => {
              const value = createMemo(() =>
                getOutputValue(props.node, port.id),
              );
              return (
                <li>
                  {describePort(props.node, port, "out")}
                  <Show when={value() !== undefined}>
                    <span class={contentCss.portValue}>
                      {formatValue(value()!)}
                    </span>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>
      </div>
      <div class={contentCss.derivedActions}>
        <button
          type="button"
          class={contentCss.button}
          onPointerDown={stop}
          onMouseDown={stop}
          onClick={() => breakApartDerivedNode(props.node.id)}
        >
          Break apart
        </button>
        <button
          type="button"
          class={contentCss.button}
          onPointerDown={stop}
          onMouseDown={stop}
          onClick={() => saveDerivedNodeType(props.node.id)}
        >
          {isSaved() ? "Update type" : "Save type"}
        </button>
      </div>
    </div>
  );
};

export default DerivedNode;
