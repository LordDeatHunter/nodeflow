export {};

declare global {
  interface CustomNodeflowDataType {
    type:
      | "switch"
      | "button"
      | "clock"
      | "gate"
      | "lamp"
      | "hex"
      | "chip"
      | "terminal";
    /** Gate nodes: which logic function they compute. */
    gate?: "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR" | "BUFFER";
    /** Switch nodes: whether the switch is closed (output high). */
    on?: boolean;
    /** Clock nodes: length of one full cycle, in milliseconds. */
    period?: number;
    /** Chips, switches and lamps: shown name. */
    name?: string;
    /** Chips: id of the saved chip type this chip was saved as. */
    templateId?: string;
    /** Chip editor terminals: which side of the chip they stand for. */
    side?: "inputs" | "outputs";
    /** Chip editor terminals: port id -> name given to that port. */
    portNames?: Record<string, string>;
  }
}
