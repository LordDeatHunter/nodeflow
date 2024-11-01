/* eslint-disable @typescript-eslint/no-empty-object-type */
export * from "./components";
export * from "./utils";
export * from "./nodeflow-types";

import "./style.css";

declare global {
  export interface CustomNodeflowDataType {}
  export interface CustomNodeConnectorDataType {}
}
