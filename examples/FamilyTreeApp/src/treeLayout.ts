import { Vec2 } from "@nodeflow-lib/solid";

/** Vertical space between generations, the same gap expanding leaves. */
const GENERATION_GAP = 350;
/** Horizontal space between the partners of a couple. */
const PARTNER_GAP = 40;
/** Horizontal space between neighbouring people or couples in a generation. */
const SIBLING_GAP = 80;
/** Horizontal space between unrelated families. */
const COMPONENT_GAP = 200;
const ORDERING_SWEEPS = 8;
const POSITIONING_PASSES = 8;

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  /** Current center x; keeps the existing left-to-right order where possible. */
  x: number;
  gender: CustomNodeflowDataType["gender"];
}

export interface LayoutEdge {
  parent: string;
  child: string;
}

export interface TreeLayout {
  /** The top-left corner of every node, with the tree centered on (0, 0). */
  positions: Map<string, Vec2>;
  size: Vec2;
}

interface Graph {
  nodes: Map<string, LayoutNode>;
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
}

/** People placed side by side as one block: a single person or partners. */
interface Unit {
  members: string[];
  /** Each member's center, relative to the unit's left edge. */
  offsets: number[];
  width: number;
}

interface ComponentLayout {
  /** Top-left corners, relative to the component's top-left corner. */
  positions: Map<string, Vec2>;
  width: number;
  height: number;
}

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const createUnionFind = (ids: Iterable<string>) => {
  const parent = new Map<string, string>();
  for (const id of ids) parent.set(id, id);

  const find = (id: string): string => {
    const root = parent.get(id)!;
    if (root === id) return id;
    const found = find(root);
    parent.set(id, found);
    return found;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const groups = () => {
    const result = new Map<string, string[]>();
    for (const id of parent.keys()) {
      const root = find(id);
      const group = result.get(root);
      if (group) group.push(id);
      else result.set(root, [id]);
    }
    return [...result.values()];
  };

  return { union, groups };
};

const buildGraph = (nodes: LayoutNode[], edges: LayoutEdge[]): Graph => {
  const graph: Graph = {
    nodes: new Map(nodes.map((node) => [node.id, node])),
    parents: new Map(nodes.map(({ id }) => [id, []])),
    children: new Map(nodes.map(({ id }) => [id, []])),
  };

  for (const { parent, child } of edges) {
    const parents = graph.parents.get(child);
    if (
      !parents ||
      !graph.nodes.has(parent) ||
      parent === child ||
      parents.includes(parent)
    ) {
      continue;
    }
    parents.push(parent);
    graph.children.get(parent)!.push(child);
  }

  return graph;
};

/**
 * Numbers generations from the top. Everyone starts one below their lowest
 * parent; then everyone with children moves down to sit right above their
 * highest child, which brings a partner who has no parents shown (or fewer
 * ancestors) onto the same row as the person they had children with.
 */
const assignGenerations = (ids: string[], graph: Graph) => {
  const generation = new Map<string, number>();
  const pendingParents = new Map(
    ids.map((id) => [id, graph.parents.get(id)!.length]),
  );
  const order = ids.filter((id) => pendingParents.get(id) === 0);

  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const parentGenerations = graph.parents
      .get(id)!
      .map((parent) => generation.get(parent)!);
    generation.set(id, Math.max(-1, ...parentGenerations) + 1);

    for (const child of graph.children.get(id)!) {
      const pending = pendingParents.get(child)! - 1;
      pendingParents.set(child, pending);
      if (pending === 0) order.push(child);
    }
  }

  // Only reachable through a cycle of parents, which validation prevents.
  for (const id of ids) {
    if (!generation.has(id)) generation.set(id, 0);
  }

  for (const id of [...order].reverse()) {
    const childGenerations = graph.children
      .get(id)!
      .map((child) => generation.get(child)!);
    if (childGenerations.length > 0) {
      generation.set(id, Math.min(...childGenerations) - 1);
    }
  }

  const top = Math.min(...generation.values());
  generation.forEach((value, id) => generation.set(id, value - top));
  return generation;
};

/**
 * Orders partners as a chain, so someone with two partners sits between them.
 * A couple is placed mother left, father right, like expanding places them.
 */
const orderPartners = (
  members: string[],
  partners: Map<string, Set<string>>,
  graph: Graph,
) => {
  if (members.length === 2) {
    const side = (id: string) => (graph.nodes.get(id)!.gender === "F" ? 0 : 1);
    return [...members].sort((a, b) => side(a) - side(b));
  }

  const degree = (id: string) => partners.get(id)?.size ?? 0;
  const chain: string[] = [];
  const visit = (id: string) => {
    chain.push(id);
    const next = [...(partners.get(id) ?? [])].find(
      (partner) => !chain.includes(partner),
    );
    if (next) visit(next);
  };
  visit(members.find((id) => degree(id) === 1) ?? members[0]);
  chain.push(...members.filter((id) => !chain.includes(id)));

  const x = (id: string) => graph.nodes.get(id)!.x;
  return x(chain[0]) > x(chain[chain.length - 1]) ? chain.reverse() : chain;
};

const createUnit = (members: string[], graph: Graph): Unit => {
  const offsets: number[] = [];
  let width = 0;
  for (const id of members) {
    if (offsets.length > 0) width += PARTNER_GAP;
    const node = graph.nodes.get(id)!;
    offsets.push(width + node.width / 2);
    width += node.width;
  }
  return { members, offsets, width };
};

/** Groups each generation into units, ordered by their current x. */
const buildRows = (
  ids: string[],
  generation: Map<string, number>,
  graph: Graph,
): Unit[][] => {
  const partnerGroups = createUnionFind(ids);
  const partners = new Map<string, Set<string>>();
  const link = (a: string, b: string) =>
    partners.set(a, (partners.get(a) ?? new Set()).add(b));

  for (const id of ids) {
    const [first, second] = graph.parents.get(id)!;
    if (second && generation.get(first) === generation.get(second)) {
      partnerGroups.union(first, second);
      link(first, second);
      link(second, first);
    }
  }

  const rows: Unit[][] = [];
  for (const members of partnerGroups.groups()) {
    const row = generation.get(members[0])!;
    rows[row] ??= [];
    rows[row].push(createUnit(orderPartners(members, partners, graph), graph));
  }

  const unitX = (unit: Unit) =>
    average(unit.members.map((id) => graph.nodes.get(id)!.x));
  // `filter` skips the holes left by any generation nobody ended up in.
  return rows
    .filter(() => true)
    .map((row) => row.sort((a, b) => unitX(a) - unitX(b)));
};

/** Each person's index within their generation. */
const indexMembers = (rows: Unit[][]) => {
  const index = new Map<string, number>();
  for (const row of rows) {
    row.flatMap((unit) => unit.members).forEach((id, i) => index.set(id, i));
  }
  return index;
};

/** Counts crossing lines between every pair of adjacent generations. */
const countCrossings = (rows: Unit[][], graph: Graph) => {
  const index = indexMembers(rows);
  let crossings = 0;

  for (let row = 0; row < rows.length - 1; row++) {
    const below = new Set(rows[row + 1].flatMap((unit) => unit.members));
    const lines = rows[row]
      .flatMap((unit) => unit.members)
      .flatMap((parent) =>
        graph.children
          .get(parent)!
          .filter((child) => below.has(child))
          .map((child) => [index.get(parent)!, index.get(child)!]),
      );

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const [parentA, childA] = lines[i];
        const [parentB, childB] = lines[j];
        if ((parentA - parentB) * (childA - childB) < 0) crossings++;
      }
    }
  }

  return crossings;
};

/**
 * Reorders the units of each generation to untangle the lines between them:
 * sweeping down, each unit moves toward its members' parents; sweeping up,
 * toward their children (the barycenter heuristic). The order with the fewest
 * crossings wins, starting with the current one.
 */
const orderRows = (rows: Unit[][], graph: Graph) => {
  let best = rows.map((row) => [...row]);
  let bestCrossings = countCrossings(best, graph);
  const current = rows.map((row) => [...row]);

  // Relative position (0 to 1) within the generation, comparable across rows.
  const position = new Map<string, number>();
  const updatePositions = (row: Unit[]) => {
    const members = row.flatMap((unit) => unit.members);
    members.forEach((id, i) => position.set(id, (i + 0.5) / members.length));
  };
  current.forEach(updatePositions);

  for (let sweep = 0; sweep < ORDERING_SWEEPS && bestCrossings > 0; sweep++) {
    const down = sweep % 2 === 0;
    const relatives = down ? graph.parents : graph.children;
    const rowOrder = current.map((_, row) => row);
    if (!down) rowOrder.reverse();

    for (const row of rowOrder) {
      const key = (unit: Unit) => {
        const neighbours = unit.members.flatMap((id) =>
          relatives.get(id)!.map((relative) => position.get(relative)!),
        );
        return average(
          neighbours.length > 0
            ? neighbours
            : unit.members.map((id) => position.get(id)!),
        );
      };
      const keys = new Map(current[row].map((unit) => [unit, key(unit)]));
      current[row].sort((a, b) => keys.get(a)! - keys.get(b)!);
      updatePositions(current[row]);
    }

    const crossings = countCrossings(current, graph);
    if (crossings < bestCrossings) {
      best = current.map((row) => [...row]);
      bestCrossings = crossings;
    }
  }

  return best;
};

/**
 * Pool-adjacent-violators: the non-decreasing sequence closest (by weighted
 * squared distance) to `targets`.
 */
const isotonicFit = (targets: number[], weights: number[]) => {
  const blocks: { value: number; weight: number; count: number }[] = [];

  targets.forEach((value, i) => {
    let block = { value, weight: weights[i], count: 1 };
    while (blocks.length > 0 && blocks[blocks.length - 1].value > block.value) {
      const previous = blocks.pop()!;
      const weight = previous.weight + block.weight;
      block = {
        value:
          (previous.value * previous.weight + block.value * block.weight) /
          weight,
        weight,
        count: previous.count + block.count,
      };
    }
    blocks.push(block);
  });

  return blocks.flatMap(({ value, count }) => Array<number>(count).fill(value));
};

/**
 * Places each generation's units from left to right, as close as their gaps
 * allow to the x each one should have: centered on its members' parents
 * (sweeping down) or children (sweeping up). Sweeps alternate, ending with one
 * up so every parent sits centered above their children.
 */
const positionRows = (rows: Unit[][], graph: Graph) => {
  const left = new Map<Unit, number>();
  const center = new Map<string, number>();
  const placeRow = (row: Unit[], lefts: number[]) =>
    row.forEach((unit, i) => {
      left.set(unit, lefts[i]);
      unit.members.forEach((id, m) =>
        center.set(id, lefts[i] + unit.offsets[m]),
      );
    });

  // Each unit's minimum distance from the row's first unit.
  const spacing = rows.map((row) => {
    let offset = 0;
    return row.map((unit) => {
      const start = offset;
      offset += unit.width + SIBLING_GAP;
      return start;
    });
  });
  rows.forEach((row, i) => placeRow(row, spacing[i]));

  const sweep = (down: boolean) => {
    const relatives = down ? graph.parents : graph.children;
    const rowOrder = rows.map((_, row) => row);
    if (!down) rowOrder.reverse();

    for (const row of rowOrder) {
      const targets: number[] = [];
      const weights: number[] = [];
      rows[row].forEach((unit, i) => {
        const wanted = unit.members.flatMap((id, m) =>
          relatives
            .get(id)!
            .map((relative) => center.get(relative)! - unit.offsets[m]),
        );
        targets.push(
          (wanted.length > 0 ? average(wanted) : left.get(unit)!) -
            spacing[row][i],
        );
        weights.push(Math.max(wanted.length, 1));
      });

      const fitted = isotonicFit(targets, weights);
      placeRow(
        rows[row],
        fitted.map((value, i) => value + spacing[row][i]),
      );
    }
  };

  for (let pass = 0; pass < POSITIONING_PASSES; pass++) {
    sweep(true);
    sweep(false);
  }

  return left;
};

const layoutComponent = (ids: string[], graph: Graph): ComponentLayout => {
  const generation = assignGenerations(ids, graph);
  const rows = orderRows(buildRows(ids, generation, graph), graph);
  const left = positionRows(rows, graph);

  const positions = new Map<string, Vec2>();
  let top = 0;
  for (const row of rows) {
    const height = Math.max(
      ...row.flatMap((unit) =>
        unit.members.map((id) => graph.nodes.get(id)!.height),
      ),
    );
    for (const unit of row) {
      unit.members.forEach((id, m) => {
        const node = graph.nodes.get(id)!;
        positions.set(
          id,
          Vec2.of(
            left.get(unit)! + unit.offsets[m] - node.width / 2,
            top + (height - node.height) / 2,
          ),
        );
      });
    }
    top += height + GENERATION_GAP;
  }

  const lefts = [...positions.values()].map(({ x }) => x);
  const rights = [...positions].map(
    ([id, { x }]) => x + graph.nodes.get(id)!.width,
  );
  const minX = Math.min(...lefts);
  positions.forEach((position, id) =>
    positions.set(id, position.subtract(Vec2.of(minX, 0))),
  );

  return {
    positions,
    width: Math.max(...rights) - minX,
    height: top - GENERATION_GAP,
  };
};

/**
 * Arranges people as a family tree: one row per generation, partners side by
 * side, children centered below their parents. Unrelated families are laid
 * out separately, side by side, in their current left-to-right order.
 */
export const computeTreeLayout = (
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): TreeLayout => {
  const graph = buildGraph(nodes, edges);

  const families = createUnionFind(graph.nodes.keys());
  graph.parents.forEach((parents, child) =>
    parents.forEach((parent) => families.union(parent, child)),
  );
  const familyX = (ids: string[]) =>
    average(ids.map((id) => graph.nodes.get(id)!.x));
  const components = families
    .groups()
    .sort((a, b) => familyX(a) - familyX(b))
    .map((ids) => layoutComponent(ids, graph));

  const width =
    components.reduce((sum, component) => sum + component.width, 0) +
    COMPONENT_GAP * Math.max(components.length - 1, 0);
  const height = Math.max(0, ...components.map((c) => c.height));

  const positions = new Map<string, Vec2>();
  let x = -width / 2;
  for (const component of components) {
    const origin = Vec2.of(x, -height / 2);
    component.positions.forEach((position, id) =>
      positions.set(id, position.add(origin)),
    );
    x += component.width + COMPONENT_GAP;
  }

  return { positions, size: Vec2.of(width, height) };
};
