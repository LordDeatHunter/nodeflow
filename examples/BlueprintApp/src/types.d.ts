export {};

declare global {
  interface CustomNodeflowDataType {
    value?: unknown;
    type: "operation" | "number" | "display";
  }
  interface CustomNodeConnectorDataType {
    type: "number" | "any";
    value?: unknown;
  }
}
