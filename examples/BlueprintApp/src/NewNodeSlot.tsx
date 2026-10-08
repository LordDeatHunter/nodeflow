import { Component, JSX } from "solid-js";
import appCss from "./styles/app.module.scss";

const NewNodeSlot: Component<{
  children: JSX.Element;
  onClick: (event: PointerEvent) => void;
}> = (props) => (
  <div
    class={appCss.paletteSlot}
    onPointerDown={(event) => props.onClick(event)}
  >
    {props.children}
  </div>
);

export default NewNodeSlot;
