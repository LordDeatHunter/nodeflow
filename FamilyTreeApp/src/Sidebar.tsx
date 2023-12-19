import drawflowCss from "./styles/sidebar.module.scss";
import { Component, createSignal, JSX } from "solid-js";

const Sidebar: Component<{ children: JSX.Element }> = (props) => {
  const [showSidebar, setShowSidebar] = createSignal<boolean>(false);

  return (
    <div
      class={drawflowCss["sidebar-container"]}
      style={{ left: showSidebar() ? "0" : "-20%" }}
    >
      <div class={drawflowCss["sidebar"]}>{props.children}</div>
      <div
        class={drawflowCss["sidebar-toggle"]}
        onClick={() => setShowSidebar(!showSidebar())}
      >
        {showSidebar() ? "X" : ">"}
      </div>
    </div>
  );
};

export default Sidebar;
