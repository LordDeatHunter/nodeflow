import { NodeflowData, NodeflowNodeData, Vec2 } from "./index";
import { createStore } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";
import { isSetEmpty } from "../misc-utils";
import { Vec2Hash } from "./Vec2";
import Rect from "./Rect";

export default class NodeflowChunking {
  private readonly store;
  private readonly nodeflowData;

  public constructor(nodeflowData: NodeflowData, chunkSize: number = 2048) {
    this.nodeflowData = nodeflowData;
    this.store = createStore({
      chunkSize,
      chunks: new ReactiveMap<Vec2Hash, Set<string>>(),
    });
  }

  public get chunkSize(): number {
    return this.store[0].chunkSize;
  }

  public set chunkSize(size: number) {
    this.store[1]({ chunkSize: size });
  }

  public get chunks(): ReactiveMap<Vec2Hash, Set<string>> {
    return this.store[0].chunks;
  }

  public set chunks(chunks: ReactiveMap<Vec2Hash, Set<string>>) {
    this.store[1]({ chunks });
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
      this.chunks.set(chunkPosition, chunk);
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
    const nodes = [] as NodeflowNodeData[];

    const startPosition = rect.startPosition();
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
