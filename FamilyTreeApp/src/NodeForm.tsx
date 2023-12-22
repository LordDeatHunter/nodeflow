import { Component, createEffect, createSignal } from "solid-js";
import { DrawflowNode, updateNode } from "solid-drawflow/src";

const NodeForm: Component<{ selectedNode: DrawflowNode }> = (props) => {
  const [name, setName] = createSignal<string>("");
  const [gender, setGender] = createSignal<"M" | "F">("M");

  createEffect(() => {
    setName(props.selectedNode.customData.name);
    setGender(props.selectedNode.customData.gender);
  });

  return (
    <>
      <h2>Selected Node</h2>
      <p>Id: {props.selectedNode.id}</p>
      <input
        type="text"
        name="lname"
        placeholder="Name"
        value={name()}
        onInput={(e) => setName(e.target.value)}
      />
      <div style={{ display: "flex" }}>
        <input
          type="radio"
          id="male"
          name="gender"
          value="M"
          checked={gender() === "M"}
          onChange={() => setGender("M")}
        />
        <p style={{ margin: 0 }}>Male</p>
      </div>
      <div style={{ display: "flex" }}>
        <input
          type="radio"
          id="female"
          name="gender"
          value="F"
          checked={gender() === "F"}
          style={{ margin: 0 }}
          onChange={() => setGender("F")}
        />
        <p style={{ margin: 0 }}>Female</p>
      </div>
      <button
        onClick={() => {
          updateNode(props.selectedNode.id, {
            customData: {
              ...props.selectedNode.customData,
              gender: gender(),
              name: name(),
            },
          });
        }}
      >
        Update
      </button>
    </>
  );
};

export default NodeForm;
