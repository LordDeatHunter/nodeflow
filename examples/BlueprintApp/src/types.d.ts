export {};

declare global {
  interface CustomNodeflowDataType {
    type:
      | "number"
      | "operation"
      | "negation"
      | "plusMinus"
      | "display"
      | "derived"
      | "terminal";
    value?: number;
    /** Operator nodes: `^` is power, `√` is root (square root with one input). */
    operator?: "+" | "-" | "*" | "/" | "%" | "^" | "√";
    /** Derived and number nodes: shown name. */
    name?: string;
    /** Derived nodes: id of the saved type this node was saved as. */
    templateId?: string;
    /** Derived-type editor terminals: which side of the type they stand for. */
    side?: "inputs" | "outputs";
    /** Derived-type editor terminals: port id -> name given to that port. */
    portNames?: Record<string, string>;
  }
}
