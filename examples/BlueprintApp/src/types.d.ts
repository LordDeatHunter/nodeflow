export {};

declare global {
  interface CustomNodeflowDataType {
    type: "number" | "operation" | "display";
    value?: number;
    operator?: "+" | "-" | "*" | "/" | "%";
  }
}
