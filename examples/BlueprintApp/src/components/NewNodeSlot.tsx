import { Component, JSX } from "solid-js";
import nodeCss from "../styles/node.module.scss";

const NewNodeSlot: Component<{ children: JSX.Element; onClick: () => void }> = (
  props,
) => (
  <div
    class={nodeCss.node}
    style={{
      width: "150px",
      height: "90px",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      "user-select": "none",
      cursor: "grab",
    }}
    onPointerDown={() => props.onClick()}
  >
    {props.children}
  </div>
);

export default NewNodeSlot;
