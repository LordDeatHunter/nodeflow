import type { NodeflowNodeType, NodeConnectorType } from "@nodeflow/core";

export type SolidNodeflowNodeType = NodeflowNodeType & {
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
};

export type SolidNodeConnectorType = NodeConnectorType & {
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
};
