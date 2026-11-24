export {};

declare global {
  interface CustomNodeflowDataType {
    type: "number" | "operation" | "display" | "derived";
    value?: number;
    operator?: "+" | "-" | "*" | "/" | "%";
    /** Derived nodes: shown name. */
    name?: string;
    /** Derived nodes: id of the saved type this node was saved as. */
    templateId?: string;
  }
}
