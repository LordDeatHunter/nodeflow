export {};

declare global {
  interface CustomNodeflowDataType {
    type:
      | "number"
      | "operation"
      | "negation"
      | "plusMinus"
      | "display"
      | "derived";
    value?: number;
    /** Operator nodes: `^` is power, `√` is root (square root with one input). */
    operator?: "+" | "-" | "*" | "/" | "%" | "^" | "√";
    /** Derived nodes: shown name. */
    name?: string;
    /** Derived nodes: id of the saved type this node was saved as. */
    templateId?: string;
  }
}
