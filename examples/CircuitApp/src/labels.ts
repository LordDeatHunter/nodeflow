/** Short name of a node kind, e.g. "NAND", used in port lists and messages. */
export const describeNodeKind = (
  data: CustomNodeflowDataType | undefined,
): string => {
  switch (data?.type) {
    case "gate":
      return data.gate ?? "AND";
    case "chip":
      return data.name ?? "Chip";
    case "switch":
      return data.name || "Switch";
    case "button":
      return data.name || "Button";
    case "clock":
      return "Clock";
    case "lamp":
      return data.name || "Lamp";
    case "hex":
      return "Hex display";
    case "terminal":
      return data.side === "outputs" ? "Outputs" : "Inputs";
    default:
      return "Node";
  }
};

/** 1-based index of a connector id like "input-1" or "port-0". */
export const connectorNumber = (connectorId: string): number =>
  Number(connectorId.split("-").at(-1)) + 1;
