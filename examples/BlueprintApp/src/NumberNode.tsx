import { Component, createEffect, createSignal } from "solid-js";
import { NodeflowNodeData } from "nodeflow-lib";
import OutputData from "./OutputData";

const NumberNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const [number, setNumber] = createSignal(0);

  const updateValue = (
    event: InputEvent & { currentTarget: HTMLInputElement },
  ) => {
    const value = event.currentTarget.value;
    const number = Number(value.replaceAll(/[^0-9.]/g, ""));

    setNumber(number);

    if (number.toString() !== value) {
      event.currentTarget.value = number.toString();
    }
  };

  createEffect(() => {
    const output = props.node.getConnector("output-0");
    if (output) {
      output.customData = new OutputData("number", number());
    }
  });

  return (
    <div
      style={{
        padding: "2rem",
      }}
    >
      <input
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "3px solid #202E37",
          "border-radius": "0.5rem",
          "box-sizing": "border-box",
          "font-size": "2rem",
          "background-color": "#819796",
          color: "#202E37",
        }}
        value={number()}
        onInput={updateValue}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default NumberNode;
