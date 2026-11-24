/** Parts are drawn in node pixels; sizes match `.node--<type>` in node.css. */
export const PART_WIDTH = 144;
export const PART_HEIGHT = 96;
export const HEX_HEIGHT = 120;

/** A connector's box (`.connector`), centred on the node edge. */
const CONNECTOR_SIZE = 20;

/**
 * Centre heights of `count` connectors on an edge `height` tall, where the
 * connector section spreads their boxes with `space-evenly`.
 */
export const connectorYs = (count: number, height: number) => {
  const gap = (height - count * CONNECTOR_SIZE) / (count + 1);
  return Array.from(
    { length: count },
    (_, i) => gap * (i + 1) + CONNECTOR_SIZE * (i + 0.5),
  );
};
