import { gateInputCount, type GateKind } from "../simulation";
import { connectorYs, PART_HEIGHT, PART_WIDTH } from "./parts/geometry";

/** Gate nodes are drawn in node pixels, like every part. */
export const GATE_WIDTH = PART_WIDTH;
export const GATE_HEIGHT = PART_HEIGHT;

/**
 * Body outlines are authored in a 70×40 box (bodies span y 4–36) and scaled
 * into the node, leaving room on both sides for the pins.
 */
const SCALE = 1.75;
const OFFSET_X = 10;
const OFFSET_Y = 13;
export const BODY_TRANSFORM = `translate(${OFFSET_X} ${OFFSET_Y}) scale(${SCALE})`;

const AND_BODY = "M8 4 H30 A16 16 0 0 1 30 36 H8 Z";
const OR_BODY = "M8 4 Q30 4 54 20 Q30 36 8 36 Q18 20 8 4 Z";
const XOR_TAIL = "M2 4 Q12 20 2 36";
const BUFFER_BODY = "M10 4 L50 20 L10 36 Z";
const BUBBLE_RADIUS = 4;

/** The x of the curved OR back (or XOR tail, `shift` -6) at height y. */
const orBackAt = (y: number, shift = 0) => {
  const t = (y - 4) / 32;
  return 8 + shift + 20 * t * (1 - t);
};

interface Outline {
  body: string;
  tail?: string;
  /** Centre x of the inverting bubble. */
  bubble?: number;
  /** Where an input pin meets the symbol, at body height y. */
  backAt: (y: number) => number;
  /** Where the output pin leaves the body (before any bubble). */
  front: number;
  /** Centre x of the kind label. */
  labelX: number;
}

const OUTLINES: Record<GateKind, Outline> = {
  AND: { body: AND_BODY, backAt: () => 8, front: 46, labelX: 25 },
  NAND: { body: AND_BODY, bubble: 50, backAt: () => 8, front: 46, labelX: 25 },
  OR: { body: OR_BODY, backAt: (y) => orBackAt(y), front: 54, labelX: 29 },
  NOR: {
    body: OR_BODY,
    bubble: 58,
    backAt: (y) => orBackAt(y),
    front: 54,
    labelX: 29,
  },
  XOR: {
    body: OR_BODY,
    tail: XOR_TAIL,
    backAt: (y) => orBackAt(y, -6),
    front: 54,
    labelX: 29,
  },
  XNOR: {
    body: OR_BODY,
    tail: XOR_TAIL,
    bubble: 58,
    backAt: (y) => orBackAt(y, -6),
    front: 54,
    labelX: 29,
  },
  BUFFER: { body: BUFFER_BODY, backAt: () => 10, front: 50, labelX: 23 },
  NOT: {
    body: BUFFER_BODY,
    bubble: 54,
    backAt: () => 10,
    front: 50,
    labelX: 23,
  },
};

const toNodeX = (x: number) => OFFSET_X + x * SCALE;
const toBodyY = (y: number) => (y - OFFSET_Y) / SCALE;

export interface Pin {
  /** Pin start (the connector, on the node edge) and end, in node pixels. */
  x1: number;
  x2: number;
  y: number;
}

export interface GateGeometry {
  body: string;
  tail?: string;
  bubble?: { cx: number; cy: number; r: number };
  inputs: Array<Pin>;
  output: Pin;
  /** Centre of the kind label, in node pixels. */
  label: { x: number; y: number };
}

/**
 * Lays out a gate's symbol and pins. Input pins sit where the connector
 * section places its connectors (spread down the left edge), so each pin
 * starts at its connector.
 */
export const gateGeometry = (kind: GateKind): GateGeometry => {
  const outline = OUTLINES[kind];
  const count = gateInputCount(kind);
  const inputs = connectorYs(count, GATE_HEIGHT).map((y) => ({
    x1: 0,
    x2: toNodeX(outline.backAt(toBodyY(y))),
    y,
  }));
  const front =
    outline.bubble === undefined
      ? outline.front
      : outline.bubble + BUBBLE_RADIUS;
  return {
    body: outline.body,
    tail: outline.tail,
    bubble:
      outline.bubble === undefined
        ? undefined
        : { cx: outline.bubble, cy: 20, r: BUBBLE_RADIUS },
    inputs,
    output: { x1: GATE_WIDTH, x2: toNodeX(front), y: GATE_HEIGHT / 2 },
    label: { x: toNodeX(outline.labelX), y: GATE_HEIGHT / 2 },
  };
};
