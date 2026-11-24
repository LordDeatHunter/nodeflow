/** Short name of a node kind, e.g. "Op +", used in port lists and messages. */
export const describeNodeKind = (
  data: CustomNodeflowDataType | undefined,
): string => {
  switch (data?.type) {
    case "operation":
      return `Op ${data.operator ?? "+"}`;
    case "derived":
      return data.name ?? "Derived";
    case "number":
      return "Number";
    case "negation":
      return "Negation";
    case "plusMinus":
      return "±";
    case "terminal":
      return data.side === "outputs" ? "Outputs" : "Inputs";
    default:
      return "Display";
  }
};

/** 1-based index of a connector id like "input-1" or "port-0". */
export const connectorNumber = (connectorId: string): number =>
  Number(connectorId.split("-").at(-1)) + 1;
