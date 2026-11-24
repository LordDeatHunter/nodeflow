import { ref, watch } from "vue";
import {
  getCompositePortTargets,
  type NodeflowData,
  type SerializedCompositeDefinition,
} from "@nodeflow-lib/vue";

export type GateKind = NonNullable<CustomNodeflowDataType["gate"]>;

export const GATE_KINDS: Array<GateKind> = [
  "AND",
  "OR",
  "NOT",
  "NAND",
  "NOR",
  "XOR",
  "XNOR",
  "BUFFER",
];

export const gateInputCount = (gate: GateKind): number =>
  gate === "NOT" || gate === "BUFFER" ? 1 : 2;

const applyGate = (gate: GateKind, [a = false, b = false]: Array<boolean>) => {
  switch (gate) {
    case "AND":
      return a && b;
    case "OR":
      return a || b;
    case "NOT":
      return !a;
    case "NAND":
      return !(a && b);
    case "NOR":
      return !(a || b);
    case "XOR":
      return a !== b;
    case "XNOR":
      return a === b;
    case "BUFFER":
      return a;
  }
};

// ─── Graphs ─────────────────────────────────────────────────────────────────

interface GraphNode {
  customData: CustomNodeflowDataType;
  composite?: SerializedCompositeDefinition;
}

interface Source {
  graph: Graph;
  nodeId: string;
  connectorId: string;
}

/**
 * A graph to simulate: the live canvas, or the inner graph of a chip. Lets
 * chips be simulated without breaking them apart, like Blueprint's derived
 * nodes are evaluated.
 */
interface Graph {
  /** Prefix for keys of nodes in this graph, unique per chip instance. */
  scope: string;
  nodeIds(): Array<string>;
  getNode(nodeId: string): GraphNode | undefined;
  /** Input connector ids, in order. */
  getInputIds(nodeId: string): Array<string>;
  /** The output feeding `inputId`, possibly in an enclosing graph. */
  getSource(nodeId: string, inputId: string): Source | undefined;
}

const liveGraph = (nodeflow: NodeflowData): Graph => {
  const graph: Graph = {
    scope: "",
    nodeIds: () => Array.from(nodeflow.nodes.keys()),
    getNode: (nodeId) => nodeflow.nodes.get(nodeId),
    getInputIds: (nodeId) =>
      Array.from(
        nodeflow.nodes.get(nodeId)?.connectorSections.get("inputs")?.connectors
          .keys() ?? [],
      ),
    getSource: (nodeId, inputId) => {
      const source = nodeflow.nodes.get(nodeId)?.getConnector(inputId)
        ?.sources.get(0)?.sourceConnector;
      return source
        ? { graph, nodeId: source.parentNode.id, connectorId: source.id }
        : undefined;
    },
  };
  return graph;
};

/**
 * The inner graph of chip `nodeId` in `outer`. Inner inputs exposed as the
 * chip's inputs read from whatever feeds those inputs outside.
 */
const definitionGraph = (
  definition: SerializedCompositeDefinition,
  outer: Graph,
  nodeId: string,
): Graph => {
  const graph: Graph = {
    scope: `${outer.scope}${nodeId}/`,
    nodeIds: () => Object.keys(definition.nodes),
    getNode: (innerId) => definition.nodes[innerId],
    getInputIds: (innerId) =>
      Object.keys(
        definition.nodes[innerId]?.connectorSections.inputs?.connectors ?? {},
      ),
    getSource: (innerId, inputId) => {
      const connection = definition.connections.find(
        (candidate) =>
          candidate.destinationNodeId === innerId &&
          candidate.destinationConnectorId === inputId,
      );
      if (connection) {
        return {
          graph,
          nodeId: connection.sourceNodeId,
          connectorId: connection.sourceConnectorId,
        };
      }

      // An input port may feed several inner inputs.
      const port = definition.inputs.find((candidate) =>
        getCompositePortTargets(candidate).some(
          (target) =>
            target.innerNodeId === innerId &&
            target.innerConnectorId === inputId,
        ),
      );
      return port ? outer.getSource(nodeId, port.id) : undefined;
    },
  };
  return graph;
};

/**
 * The key of the signal on output `outputId` of a node, following chips down
 * to the primitive that drives it. `undefined` when nothing drives it.
 */
const resolveOutput = (
  graph: Graph,
  nodeId: string,
  outputId: string,
): string | undefined => {
  const node = graph.getNode(nodeId);
  switch (node?.customData.type) {
    case undefined:
    case "terminal":
      return undefined;
    case "chip": {
      const definition = node.composite;
      const port = definition?.outputs.find(
        (candidate) => candidate.id === outputId,
      );
      if (!definition || !port) return undefined;
      return resolveOutput(
        definitionGraph(definition, graph, nodeId),
        port.innerNodeId,
        port.innerConnectorId,
      );
    }
    default:
      return `${graph.scope}${nodeId}:${outputId}`;
  }
};

const resolveInput = (
  graph: Graph,
  nodeId: string,
  inputId: string,
): string | undefined => {
  const source = graph.getSource(nodeId, inputId);
  return source
    ? resolveOutput(source.graph, source.nodeId, source.connectorId)
    : undefined;
};

// ─── Netlist ────────────────────────────────────────────────────────────────

/** A switch, button, clock, gate, lamp or hex display, chips flattened. */
interface Primitive {
  /** Unique in the canvas: the node id, prefixed by enclosing chip ids. */
  key: string;
  data: CustomNodeflowDataType;
  /** Signal keys feeding each input; `undefined` for an unconnected input. */
  inputs: Array<string | undefined>;
  /** Signal key of its one output (unused by lamps and hex displays). */
  output: string;
}

const collectPrimitives = (graph: Graph, into: Array<Primitive>) => {
  graph.nodeIds().forEach((nodeId) => {
    const node = graph.getNode(nodeId);
    if (!node) return;
    const { type } = node.customData;
    if (type === "terminal") return;
    if (type === "chip") {
      if (node.composite) {
        collectPrimitives(
          definitionGraph(node.composite, graph, nodeId),
          into,
        );
      }
      return;
    }
    const key = `${graph.scope}${nodeId}`;
    into.push({
      key,
      data: node.customData,
      inputs: graph
        .getInputIds(nodeId)
        .map((inputId) => resolveInput(graph, nodeId, inputId)),
      output: `${key}:output-0`,
    });
  });
};

// ─── Simulation ─────────────────────────────────────────────────────────────

/** Passes over the gates before a circuit counts as oscillating. */
const MAX_SETTLE_PASSES = 100;
/** Clock periods a clock node offers, in frames per full cycle. */
export const CLOCK_PERIODS = [2, 4, 8, 16];
export const DEFAULT_CLOCK_PERIOD = 4;
/** Frame lengths the step-time slider allows, in milliseconds. */
export const FRAME_MS_MIN = 25;
export const FRAME_MS_MAX = 1000;
const DEFAULT_FRAME_MS = 250;

/** A clock's period in frames; anything unknown falls back to the default. */
export const clockPeriod = (period: number | undefined) =>
  period !== undefined && CLOCK_PERIODS.includes(period)
    ? period
    : DEFAULT_CLOCK_PERIOD;

export const WIRE_CSS = { normal: "wire", selected: "wire--selected" };
const WIRE_ON_CSS = { normal: "wire wire--on", selected: "wire--selected" };

/** Bumped whenever any canvas's signals change; displays track it. */
const signalRevision = ref(0);
export const trackSignals = () => signalRevision.value;

/** Whether time is paused (Step still advances it a frame at a time). */
export const clocksPaused = ref(false);
/** How long one frame lasts, in milliseconds. Clocks count frames. */
export const frameMs = ref(DEFAULT_FRAME_MS);

/**
 * Simulates one canvas. Signals settle by repeated passes over every gate
 * (each pass reads the newest values), so feedback loops such as latches
 * work; a loop that never settles, like a NOT gate wired to itself, is
 * flagged as oscillating. Signals are kept by key across edits, so a latch
 * keeps its state when something else on the canvas changes.
 */
export class CircuitSimulation {
  public readonly oscillating = ref(false);
  private readonly signals = new Map<string, boolean>();
  /** Buttons held down, by primitive key. */
  private readonly pressed = new Set<string>();
  /** Each clock's level and the frames since it last flipped. */
  private readonly clocks = new Map<
    string,
    { level: boolean; frames: number }
  >();
  private primitives: Array<Primitive> = [];
  /** What feeds what, to tell displays when the wiring changed. */
  private wiring = "";
  private scheduled = false;
  private painting = false;

  public constructor(public readonly nodeflow: NodeflowData) {
    nodeflow.eventStore.onContentChanged.subscribe("circuit:simulate", () =>
      this.schedule(),
    );
    this.schedule();
  }

  public dispose() {
    this.nodeflow.eventStore.onContentChanged.unsubscribe("circuit:simulate");
  }

  /** Re-runs the simulation once the current burst of changes is over. */
  public schedule() {
    if (this.painting || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.run();
    });
  }

  public setPressed(nodeId: string, pressed: boolean) {
    if (pressed) this.pressed.add(nodeId);
    else this.pressed.delete(nodeId);
    this.run();
  }

  /** Advances time one frame, flipping clocks whose half cycle is over. */
  public frame() {
    let flipped = false;
    this.primitives.forEach(({ key, data }) => {
      if (data.type !== "clock") return;
      const clock = this.clocks.get(key);
      if (!clock) return;
      clock.frames++;
      if (clock.frames < clockPeriod(data.period) / 2) return;
      clock.level = !clock.level;
      clock.frames = 0;
      flipped = true;
    });
    if (flipped) this.run();
  }

  /** The level on output `outputId` of a node; `undefined` if undriven. */
  public outputLevel(nodeId: string, outputId: string): boolean | undefined {
    const key = resolveOutput(liveGraph(this.nodeflow), nodeId, outputId);
    return key === undefined ? undefined : (this.signals.get(key) ?? false);
  }

  /** The level on input `inputId` of a node; unconnected inputs are low. */
  public inputLevel(nodeId: string, inputId: string): boolean {
    const key = resolveInput(liveGraph(this.nodeflow), nodeId, inputId);
    return key === undefined ? false : (this.signals.get(key) ?? false);
  }

  private run() {
    const primitives: Array<Primitive> = [];
    collectPrimitives(liveGraph(this.nodeflow), primitives);
    this.primitives = primitives;

    // New clocks start low; removed ones and their signals are dropped.
    const keys = new Set(primitives.map((primitive) => primitive.key));
    primitives.forEach(({ key, data }) => {
      if (data.type === "clock" && !this.clocks.has(key)) {
        this.clocks.set(key, { level: false, frames: 0 });
      }
    });
    this.clocks.forEach((_, key) => {
      if (!keys.has(key)) this.clocks.delete(key);
    });
    const outputs = new Set(primitives.map((primitive) => primitive.output));
    this.signals.forEach((_, key) => {
      if (!outputs.has(key)) this.signals.delete(key);
    });

    const wiring = primitives
      .map(({ key, inputs }) => `${key}<${inputs.join(",")}`)
      .join("|");
    const rewired = wiring !== this.wiring;
    this.wiring = wiring;

    const changed = this.settle();
    this.paintWires();
    if (changed || rewired) signalRevision.value++;
  }

  /** Settles every signal; returns whether any of them changed. */
  private settle(): boolean {
    let changed = false;
    const set = (key: string, level: boolean) => {
      if (this.signals.get(key) === level) return false;
      this.signals.set(key, level);
      return true;
    };

    this.primitives.forEach(({ key, data, output }) => {
      switch (data.type) {
        case "switch":
          changed = set(output, !!data.on) || changed;
          break;
        case "button":
          changed = set(output, this.pressed.has(key)) || changed;
          break;
        case "clock":
          changed = set(output, this.clocks.get(key)?.level ?? false) || changed;
          break;
      }
    });

    const gates = this.primitives.filter(({ data }) => data.type === "gate");
    let passes = 0;
    for (; passes < MAX_SETTLE_PASSES; passes++) {
      let passChanged = false;
      gates.forEach(({ data, inputs, output }) => {
        const levels = inputs.map((key) =>
          key === undefined ? false : (this.signals.get(key) ?? false),
        );
        passChanged = set(output, applyGate(data.gate ?? "AND", levels)) ||
          passChanged;
      });
      changed ||= passChanged;
      if (!passChanged) break;
    }
    this.oscillating.value = passes === MAX_SETTLE_PASSES;
    return changed;
  }

  /** Lights up the wires carrying a high signal. */
  private paintWires() {
    let repainted = false;
    this.nodeflow.nodes.forEach((node) => {
      node.connectorSections.get("outputs")?.connectors.forEach((connector) => {
        const css = this.outputLevel(node.id, connector.id)
          ? WIRE_ON_CSS
          : WIRE_CSS;
        connector.destinations.forEach((destination) => {
          if (destination.css?.normal === css.normal) return;
          destination.css = { ...css };
          repainted = true;
        });
      });
    });
    if (!repainted) return;
    // Redraws the wires without simulating again.
    this.painting = true;
    try {
      this.nodeflow.publishContentChanged();
    } finally {
      this.painting = false;
    }
  }
}

const simulations = new Map<NodeflowData, CircuitSimulation>();

/** Starts simulating `nodeflow`; returns a function that stops it. */
export const startSimulation = (nodeflow: NodeflowData): (() => void) => {
  simulations.get(nodeflow)?.dispose();
  const simulation = new CircuitSimulation(nodeflow);
  simulations.set(nodeflow, simulation);
  signalRevision.value++;
  return () => {
    simulation.dispose();
    if (simulations.get(nodeflow) === simulation) simulations.delete(nodeflow);
  };
};

export const simulationOf = (
  nodeflow: NodeflowData,
): CircuitSimulation | undefined => simulations.get(nodeflow);

/** Frames advanced so far; displays that draw over time track it. */
export const frameCount = ref(0);

/** Advances every canvas one frame. */
export const stepFrame = () => {
  simulations.forEach((simulation) => simulation.frame());
  frameCount.value++;
};

let frameTimer: ReturnType<typeof setInterval> | undefined;
watch(
  frameMs,
  (ms) => {
    clearInterval(frameTimer);
    frameTimer = setInterval(() => {
      if (!clocksPaused.value) stepFrame();
    }, ms);
  },
  { immediate: true },
);
