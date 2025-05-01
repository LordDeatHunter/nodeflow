import { createSignal } from "solid-js";
import { CustomNodeData, DisplayFunc, NodeflowNodeData } from "nodeflow-lib";
import NumberConnector from "./data/NumberConnector";

export class NumberNodeData extends CustomNodeData {
  public readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  public serialize(): CustomNodeflowDataType {
    return {
      value: this.value,
      type: "number",
    };
  }
}

const NumberNode: DisplayFunc = (props: { node: NodeflowNodeData }) => {
  const [number, setNumber] = createSignal(
    (props.node.customData as NumberNodeData).value,
  );

  props.node.nodeflow.eventStore.onNodeCustomDataChanged.subscribe(
    `number-node-${props.node.id}-data-changed`,
    ({ nodeId, customData }) => {
      if (nodeId !== props.node.id) return;
      setNumber(customData?.value);
    },
  );

  const updateValue = (
    event: InputEvent & { currentTarget: HTMLInputElement },
  ) => {
    const value = event.currentTarget.value;
    const number = Number(value.replaceAll(/[^0-9.]/g, ""));

    props.node.customData = new NumberNodeData(number);
    const output = props.node.getConnector("output-0");
    if (output) {
      output.customData = new NumberConnector(number);
    }

    if (number.toString() !== value) {
      event.currentTarget.value = number.toString();
    }
  };

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
        value={number() ?? 0}
        onInput={updateValue}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  ) as HTMLDivElement;
};

export default NumberNode;
