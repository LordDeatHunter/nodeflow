export * from "./components";
export * from "./utils";
export * from "./nodeflow-types";

import "./style.css";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface CustomNodeflowDataType {}
}
