import { describe, it, expect } from "bun:test";
import NodeflowChunking from "../../../src/utils/data/NodeflowChunking";
import NodeflowData from "../../../src/utils/data/NodeflowData";
import Vec2 from "../../../src/utils/data/Vec2";
import Rect from "../../../src/utils/data/Rect";

let testId = 0;
function createNodeflow(): NodeflowData {
  return new NodeflowData(`test-chunk-${++testId}`);
}

function createChunking(nf: NodeflowData, chunkSize = 2048): NodeflowChunking {
  return new NodeflowChunking(nf, chunkSize);
}

describe("NodeflowChunking – default state", () => {
  it("chunks map is empty on construction", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);
    expect(chunking.chunks.size).toBe(0);
  });

  it("getChunk returns empty set for an unused position", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);
    const result = chunking.getChunk(Vec2.of(0, 0));
    expect(result.size).toBe(0);
  });

  it("chunkSize defaults to 2048", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);
    expect(chunking.chunkSize).toBe(2048);
  });

  it("chunkSize can be overridden via constructor", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf, 512);
    expect(chunking.chunkSize).toBe(512);
  });
});

describe("NodeflowChunking – adding a node to a chunk", () => {
  it("addNodeToChunk places node id in the chunk for that position", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    chunking.addNodeToChunk("node-1", Vec2.of(0, 0));

    const chunk = chunking.getChunk(Vec2.of(0, 0));
    expect(chunk.has("node-1")).toBe(true);
  });

  it("chunk is created in the chunks map after adding", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    chunking.addNodeToChunk("node-a", Vec2.of(100, 200));
    expect(chunking.chunks.size).toBe(1);
  });

  it("two nodes at the same chunk position share one chunk entry", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    chunking.addNodeToChunk("alpha", Vec2.of(0, 0));
    chunking.addNodeToChunk("beta", Vec2.of(10, 10));

    expect(chunking.chunks.size).toBe(1);
    const chunk = chunking.getChunk(Vec2.of(0, 0));
    expect(chunk.has("alpha")).toBe(true);
    expect(chunk.has("beta")).toBe(true);
  });

  it("nodes in different chunk positions land in separate chunks", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf, 100);

    chunking.addNodeToChunk("left", Vec2.of(0, 0));
    chunking.addNodeToChunk("right", Vec2.of(200, 0));

    expect(chunking.chunks.size).toBe(2);
  });
});

describe("NodeflowChunking – removing a node from a chunk", () => {
  it("removeNodeFromChunk removes node id from the chunk", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    chunking.addNodeToChunk("to-remove", Vec2.of(0, 0));
    expect(chunking.getChunk(Vec2.of(0, 0)).has("to-remove")).toBe(true);

    chunking.removeNodeFromChunk("to-remove", Vec2.of(0, 0));
    expect(chunking.getChunk(Vec2.of(0, 0)).has("to-remove")).toBe(false);
  });

  it("removing a non-existent node is a no-op (does not throw)", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    expect(() =>
      chunking.removeNodeFromChunk("ghost", Vec2.of(0, 0)),
    ).not.toThrow();
  });

  it("removing one node leaves remaining nodes intact in the chunk", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    chunking.addNodeToChunk("keep", Vec2.of(0, 0));
    chunking.addNodeToChunk("gone", Vec2.of(0, 0));

    chunking.removeNodeFromChunk("gone", Vec2.of(0, 0));

    const chunk = chunking.getChunk(Vec2.of(0, 0));
    expect(chunk.has("keep")).toBe(true);
    expect(chunk.has("gone")).toBe(false);
  });
});

describe("NodeflowChunking – updateNodeInChunk", () => {
  it("moves a node from the old chunk to the new chunk", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf, 100);

    chunking.addNodeToChunk("mover", Vec2.of(0, 0));
    expect(chunking.getChunk(Vec2.of(0, 0)).has("mover")).toBe(true);

    chunking.updateNodeInChunk("mover", Vec2.of(0, 0), Vec2.of(200, 0));

    expect(chunking.getChunk(Vec2.of(0, 0)).has("mover")).toBe(false);
    expect(chunking.getChunk(Vec2.of(200, 0)).has("mover")).toBe(true);
  });

  it("does nothing when old and new position fall in the same chunk", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf, 2048);

    chunking.addNodeToChunk("stable", Vec2.of(0, 0));

    const sizeBefore = chunking.chunks.size;
    chunking.updateNodeInChunk("stable", Vec2.of(0, 0), Vec2.of(100, 100));

    expect(chunking.chunks.size).toBe(sizeBefore);
    expect(chunking.getChunk(Vec2.of(0, 0)).has("stable")).toBe(true);
  });
});

describe("NodeflowChunking – getNodesInRect", () => {
  it("returns empty array when no nodes have been added to chunking", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);
    const rect = Rect.of(Vec2.of(0, 0), Vec2.of(500, 500));
    expect(chunking.getNodesInRect(rect)).toEqual([]);
  });

  it("returns a node whose position falls within the queried rect", () => {
    const nf = createNodeflow();
    nf.addNode({ id: "inside", position: { x: 100, y: 100 } }, false);
    const chunking = nf.chunking;

    chunking.addNodeToChunk("inside", Vec2.of(100, 100));

    const rect = Rect.of(Vec2.of(0, 0), Vec2.of(500, 500));
    const results = chunking.getNodesInRect(rect);
    const ids = results.map((n) => n.id);
    expect(ids).toContain("inside");
  });

  it("re-adding a node after removal works correctly", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf);

    chunking.addNodeToChunk("cycle", Vec2.of(0, 0));
    chunking.removeNodeFromChunk("cycle", Vec2.of(0, 0));
    chunking.addNodeToChunk("cycle", Vec2.of(0, 0));

    const chunk = chunking.getChunk(Vec2.of(0, 0));
    expect(chunk.has("cycle")).toBe(true);
    expect(chunk.size).toBe(1);
  });
});

describe("NodeflowChunking – chunkSize setter", () => {
  it("chunkSize can be updated after construction", () => {
    const nf = createNodeflow();
    const chunking = createChunking(nf, 1024);

    chunking.chunkSize = 256;
    expect(chunking.chunkSize).toBe(256);
  });
});
