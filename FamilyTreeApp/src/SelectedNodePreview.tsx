import { DrawflowNode, mouseData, nodes, Optional } from "solid-drawflow/src";
import { createMemo, Show } from "solid-js";

const SelectedNodePreview = () => {
  const node = createMemo<Optional<DrawflowNode>>(() =>
    mouseData?.heldNodeId ? nodes[mouseData.heldNodeId] : undefined,
  );

  return (
    <>
      <h1>Family Tree</h1>
      <Show when={!!node()} fallback={<h2>No Node Selected</h2>}>
        <h2>Selected Node</h2>
        <p>Id: {node()!.id}</p>
        <input
          type="text"
          name="lname"
          placeholder="Name"
          value={node()?.customData?.name}
          onInput={(e) => console.log(e.target.value)}
        />
        <div style={{ display: "flex" }}>
          <input
            type="radio"
            id="male"
            name="gender"
            value="Male"
            checked={node()!.customData!.gender === "M"}
          />
          <p style={{ margin: 0 }}>Male</p>
        </div>
        <div style={{ display: "flex" }}>
          <input
            type="radio"
            id="female"
            name="gender"
            value="Female"
            checked={node()!.customData!.gender === "F"}
            style={{ margin: 0 }}
          />
          <p style={{ margin: 0 }}>Female</p>
        </div>
      </Show>
    </>
  );
};

export default SelectedNodePreview;
