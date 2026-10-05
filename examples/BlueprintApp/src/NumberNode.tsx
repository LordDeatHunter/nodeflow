import { Component, createMemo } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision, markBlueprintDirty } from "./reactivity";

const inputStyle = {
  width: "100%",
  padding: "0.5rem",
  border: "3px solid #202E37",
  "border-radius": "0.5rem",
  "box-sizing": "border-box",
  "font-size": "2rem",
  "background-color": "#819796",
  color: "#202E37",
};

const NumberNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const number = createMemo(() => {
    blueprintRevision();
    return props.node.customData.value ?? 0;
  });

  const updateValue = (raw: string): number => {
    const parsed = Number(raw.replaceAll(/[^0-9.]/g, ""));
    const value = Number.isNaN(parsed) ? 0 : parsed;
    props.node.customData = { ...props.node.customData, value };
    markBlueprintDirty();
    return value;
  };

  return (
    <div style={{ padding: "2rem" }}>
      <input
        style={inputStyle}
        value={number()}
        onInput={(event) => {
          const value = updateValue(event.currentTarget.value);
          if (String(value) !== event.currentTarget.value) {
            event.currentTarget.value = String(value);
          }
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      />
    </div>
  );
};

export default NumberNode;
