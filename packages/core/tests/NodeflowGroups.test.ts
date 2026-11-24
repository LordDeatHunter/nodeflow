import { describe, it, expect } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import Rect from "../src/Rect";

let testId = 0;

const createNodeflow = (settings: Partial<NodeflowData["settings"]> = {}) => {
  const nf = new NodeflowData(`test-groups-${++testId}`, {
    groupPadding: 10,
    groupHeaderHeight: 20,
    virtualizationMargin: 0,
    ...settings,
  });
  nf.updateCanvasSize(Vec2.of(2000, 2000));
  return nf;
};

const addNode = (nf: NodeflowData, id: string, x: number, y: number) =>
  nf.addNode(
    {
      id,
      position: { x, y },
      size: { x: 100, y: 50 },
      connectorSections: {
        s: {
          id: "s",
          connectors: {
            c: { id: "c", hovered: false, position: { x: 0, y: 0 } },
          },
        },
      },
    },
    false,
  );

const connect = (nf: NodeflowData, source: string, destination: string) =>
  nf.addConnection(
    {
      sourceNodeId: source,
      sourceConnectorId: "c",
      destinationNodeId: destination,
      destinationConnectorId: "c",
    },
    false,
  );

const build = () => {
  const nf = createNodeflow();
  addNode(nf, "a", 100, 100);
  addNode(nf, "b", 300, 200);
  addNode(nf, "outside", 800, 150);
  connect(nf, "a", "b");
  connect(nf, "b", "outside");
  return nf;
};

describe("groups", () => {
  it("frames their members with padding and a header", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"], { title: "Pair" })!;

    expect(group.title).toBe("Pair");
    expect(nf.getGroupOfNode("a")).toBe(group);
    const bounds = group.getBounds()!;
    expect(bounds.position.equals(Vec2.of(90, 70))).toBe(true);
    expect(bounds.size.equals(Vec2.of(320, 190))).toBe(true);
  });

  it("ignores missing nodes and empty selections", () => {
    const nf = build();
    expect(nf.addGroup(["missing"])).toBeUndefined();
    expect(nf.groups.size).toBe(0);
  });

  it("moves nodes between groups, removing emptied ones", () => {
    const nf = build();
    const first = nf.addGroup(["a"])!;
    const second = nf.addGroup(["a", "b"])!;

    expect(nf.groups.has(first.id)).toBe(false);
    expect(nf.getGroupOfNode("a")).toBe(second);
  });

  it("hides collapsed members from rendering and box selection", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;
    nf.setGroupCollapsed(group.id, true);

    expect(nf.isNodeHidden("a")).toBe(true);
    expect(nf.getRenderedNodeIds()).toEqual(["outside"]);
    expect([...nf.getVisibleNodeIds()!]).toEqual(["outside"]);

    nf.updateSettings({ virtualization: false });
    expect(nf.getRenderedNodeIds()).toEqual(["outside"]);

    nf.mouseData.selectionBox.boundingBox = Rect.of(
      Vec2.zero(),
      Vec2.of(2000, 2000),
    );
    expect(
      nf.mouseData.selectionBox.selections.selectedNodes.map((n) => n.id),
    ).toEqual(["outside"]);
  });

  it("hides connections inside a collapsed group only", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;
    expect(nf.isConnectionHidden("a", "b")).toBe(false);

    nf.setGroupCollapsed(group.id, true);
    expect(nf.isConnectionHidden("a", "b")).toBe(true);
    expect(nf.isConnectionHidden("b", "outside")).toBe(false);
  });

  it("attaches outside connections to the collapsed box", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;
    nf.setGroupCollapsed(group.id, true);
    group.updateCollapsedSize(Vec2.of(100, 40));

    const box = group.getCollapsedRect()!;
    expect(box.position.equals(Vec2.of(90, 70))).toBe(true);

    const b = nf.nodes.get("b")!.getConnector("c")!;
    const outside = nf.nodes.get("outside")!.getConnector("c")!;
    const { start, end, startAnchor } = nf.getConnectionEndpoints(b, outside);

    // The outside node sits to the right: the line leaves the box's right edge.
    expect(start.x).toBeCloseTo(190);
    expect(start.y).toBeGreaterThanOrEqual(70);
    expect(start.y).toBeLessThanOrEqual(110);
    expect(startAnchor.equals(box.center)).toBe(true);
    expect(end.equals(outside.getCenter())).toBe(true);
  });

  it("pointOnRectToward returns points inside the rect unchanged", () => {
    const rect = Rect.of(Vec2.zero(), Vec2.of(100, 100));
    expect(
      NodeflowData.pointOnRectToward(rect, Vec2.of(60, 60)).equals(
        Vec2.of(60, 60),
      ),
    ).toBe(true);
    expect(
      NodeflowData.pointOnRectToward(rect, Vec2.of(50, -100)).equals(
        Vec2.of(50, 0),
      ),
    ).toBe(true);
  });

  it("selectGroup selects every member, including hidden ones", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;
    nf.setGroupCollapsed(group.id, true);

    nf.selectGroup(group.id);
    expect(nf.mouseData.heldNodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(group.isSelected()).toBe(true);
  });

  it("toggles collapse on onGroupCollapseToggled", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;
    nf.eventStore.onGroupCollapseToggled.publish({ groupId: group.id });
    expect(group.collapsed).toBe(true);
  });

  it("records group changes for undo and redo", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"], { title: "Pair" })!;
    nf.setGroupCollapsed(group.id, true);
    nf.updateGroup(group.id, { title: "Renamed" });

    nf.changes.undo();
    expect(nf.groups.get(group.id)!.title).toBe("Pair");
    nf.changes.undo();
    expect(nf.groups.get(group.id)!.collapsed).toBe(false);
    nf.changes.undo();
    expect(nf.groups.size).toBe(0);
    expect(nf.getGroupOfNode("a")).toBeUndefined();

    nf.changes.redo();
    expect(nf.getGroupOfNode("a")?.title).toBe("Pair");
  });

  it("renameGroup trims, ignores blank or unchanged titles, and undoes", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"], { title: "Pair" })!;

    expect(nf.renameGroup(group.id, "   ")).toBe(false);
    expect(nf.renameGroup(group.id, "Pair")).toBe(false);
    expect(nf.renameGroup("missing", "X")).toBe(false);
    expect(nf.groups.get(group.id)!.title).toBe("Pair");

    expect(nf.renameGroup(group.id, "  Inputs  ")).toBe(true);
    expect(nf.groups.get(group.id)!.title).toBe("Inputs");

    nf.changes.undo();
    expect(nf.groups.get(group.id)!.title).toBe("Pair");
  });

  it("removeNode prunes members and deletes emptied groups, undoably", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;

    nf.removeNode("a");
    expect([...group.nodeIds]).toEqual(["b"]);

    nf.removeNode("b");
    expect(nf.groups.size).toBe(0);

    nf.changes.undo();
    nf.changes.undo();
    expect(nf.getGroupOfNode("a")?.id).toBe(group.id);
    expect([...nf.groups.get(group.id)!.nodeIds].sort()).toEqual(["a", "b"]);
  });

  it("serializes groups and loads data saved without them", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"], { title: "Pair", collapsed: true })!;
    const data = JSON.parse(JSON.stringify(nf.serialize()));

    const copy = createNodeflow();
    copy.deserialize(data);
    expect(copy.groups.get(group.id)!.serialize()).toEqual(group.serialize());
    expect(copy.isNodeHidden("b")).toBe(true);

    delete data.groups;
    const legacy = createNodeflow();
    legacy.deserialize(data);
    expect(legacy.groups.size).toBe(0);
  });

  it("composites take the place of their inner nodes in a group", () => {
    const nf = build();
    const group = nf.addGroup(["a", "b"])!;

    const composite = nf.createCompositeNode(["a", "b"])!;
    expect([...group.nodeIds]).toEqual([composite.id]);

    const restored = nf.explodeCompositeNode(composite.id);
    expect([...nf.groups.get(group.id)!.nodeIds].sort()).toEqual(
      restored.map((node) => node.id).sort(),
    );
  });
});
