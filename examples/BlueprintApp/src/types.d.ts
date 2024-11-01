export {};

declare global {
  interface CustomNodeConnectorDataType {
    origin: "input" | "output";
    storedData?: {
      value: unknown;
    };
  }
}
