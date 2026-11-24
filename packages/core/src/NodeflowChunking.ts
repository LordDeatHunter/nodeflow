import Vec2, { Vec2Hash } from "./Vec2";
import Rect from "./Rect";
import { isSetEmpty } from "./misc-utils";
import type NodeflowData from "./NodeflowData";
import type NodeflowNodeData from "./NodeflowNodeData";

export default class NodeflowChunking {
  private _chunkSize: number;
  private _chunks: Map<Vec2Hash, Set<string>> = new Map();
  /**
   * Largest node extent (`rectWithOffset.size`) seen so far. Nodes are keyed
   * by their top-left position only, so `getNodesInRect` widens its scan by
   * this much up and left to catch nodes that start before the rect.
   */
  private _maxNodeExtent: Vec2 = Vec2.zero();
  private readonly nodeflowData: NodeflowData;

  public constructor(nodeflowData: NodeflowData, chunkSize: number = 2048) {
    this.nodeflowData = nodeflowData;
    this._chunkSize = chunkSize;
  }

  public get chunkSize(): number {
    return this._chunkSize;
  }

  public set chunkSize(size: number) {
    this._chunkSize = size;
    this.rebuild();
  }

  public get maxNodeExtent(): Vec2 {
    return this._maxNodeExtent;
  }

  /**
   * Grows `maxNodeExtent` to cover `extent`. Never shrinks, so a stale large
   * value only costs a slightly wider scan.
   */
  public trackNodeExtent(extent: Vec2): void {
    if (
      extent.x <= this._maxNodeExtent.x &&
      extent.y <= this._maxNodeExtent.y
    ) {
      return;
    }

    this._maxNodeExtent = Vec2.of(
      Math.max(extent.x, this._maxNodeExtent.x),
      Math.max(extent.y, this._maxNodeExtent.y),
    );
  }

  /** Re-indexes every node of the owning `NodeflowData` from scratch. */
  public rebuild(): void {
    this._chunks = new Map();
    this._maxNodeExtent = Vec2.zero();
    this.nodeflowData.nodes.forEach((node) => {
      this.addNodeToChunk(node.id, node.position);
      this.trackNodeExtent(node.rectWithOffset.size);
    });
  }

  public get chunks(): Map<Vec2Hash, Set<string>> {
    return this._chunks;
  }

  public set chunks(chunks: Map<Vec2Hash, Set<string>>) {
    this._chunks = chunks;
  }

  public addNodeToChunk(nodeId: string, position: Vec2): void {
    const chunkPosition = this.calculateChunkPosition(position).hashCode();
    const chunk = this.chunks.get(chunkPosition) || new Set();
    chunk.add(nodeId);
    this.chunks.set(chunkPosition, chunk);
  }

  public removeNodeFromChunk(nodeId: string, position: Vec2): void {
    const chunkPosition = this.calculateChunkPosition(position).hashCode();
    const chunk = this.chunks.get(chunkPosition);
    if (chunk) {
      chunk.delete(nodeId);
      if (isSetEmpty(chunk)) {
        this.chunks.delete(chunkPosition);
      }
    }
  }

  public updateNodeInChunk(
    nodeId: string,
    oldPosition: Vec2,
    newPosition: Vec2,
  ): void {
    const oldChunkPosition =
      this.calculateChunkPosition(oldPosition).hashCode();
    const newChunkPosition =
      this.calculateChunkPosition(newPosition).hashCode();

    if (oldChunkPosition == newChunkPosition) {
      return;
    }

    const oldChunk = this.chunks.get(oldChunkPosition);
    const newChunk = this.chunks.get(newChunkPosition) || new Set();

    if (oldChunk) {
      oldChunk.delete(nodeId);
      this.chunks.set(oldChunkPosition, oldChunk);
      if (isSetEmpty(oldChunk)) {
        this.chunks.delete(oldChunkPosition);
      }
    }

    if (newChunk) {
      newChunk.add(nodeId);
      this.chunks.set(newChunkPosition, newChunk);
    }
  }

  public getChunk(position: Vec2): Set<string> {
    return (
      this.chunks.get(this.calculateChunkPosition(position).hashCode()) ||
      new Set()
    );
  }

  private calculateChunkPosition(position: Vec2): Vec2 {
    return Vec2.of(
      Math.floor(position.x / this.chunkSize),
      Math.floor(position.y / this.chunkSize),
    );
  }

  public checkForCollisions(id: string): string[] {
    // TODO: Make this check per-node instead of only checking global settings
    if (!this.nodeflowData.settings.allowCollision) {
      return [];
    }

    const node = this.nodeflowData.nodes.get(id);

    const chunks = [] as string[];

    if (!node) {
      return chunks;
    }

    for (let i = -1; i < 2; ++i) {
      for (let j = -1; j < 2; ++j) {
        const chunk = this.getChunk(
          node.rectWithOffset.position.add(
            Vec2.of(i * this.chunkSize, j * this.chunkSize),
          ),
        );

        if (chunk.size > 0) {
          chunks.push(...chunk);
        }
      }
    }

    return chunks.filter((nodeId) => {
      const checkNode = this.nodeflowData.nodes.get(nodeId);
      if (checkNode?.id == node.id) {
        return false;
      }

      return (
        checkNode &&
        checkNode.id != node.id &&
        checkNode.rectWithOffset.intersects(node.rectWithOffset)
      );
    });
  }

  public getNodesInRect(rect: Rect): NodeflowNodeData[] {
    const nodes: NodeflowNodeData[] = [];

    // A node is indexed by its top-left corner, so one that starts up or left
    // of the rect can still overlap it.
    const startPosition = rect.startPosition().subtract(this._maxNodeExtent);
    const endPosition = rect.endPosition();

    const startChunk = this.calculateChunkPosition(startPosition);
    const endChunk = this.calculateChunkPosition(endPosition);

    for (let x = startChunk.x; x <= endChunk.x; ++x) {
      for (let y = startChunk.y; y <= endChunk.y; ++y) {
        const chunk = this.chunks.get(Vec2.of(x, y).hashCode());
        if (!chunk) {
          continue;
        }
        chunk.forEach((nodeId) => {
          const node = this.nodeflowData.nodes.get(nodeId);
          if (node && rect.intersects(node.rectWithOffset)) {
            nodes.push(node);
          }
        });
      }
    }

    return nodes;
  }
}
