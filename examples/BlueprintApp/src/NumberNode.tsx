import { Component, createMemo } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision, markBlueprintDirty } from "./reactivity";
import contentCss from "./styles/content.module.scss";

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
    <div class={contentCss.pad}>
      <span class={contentCss.label}>Value</span>
      <input
        class={contentCss.control}
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
