import { deepCopy, generateId } from "./misc-utils";
import { stripDefinitionDisplay, stripNodeDisplay } from "./CompositeNodes";
import type NodeflowData from "./NodeflowData";
import type { NodeTemplate } from "./nodeflow-types";

/**
 * Reusable composite node types. Core only keeps them in memory: apps persist
 * them wherever they like by subscribing to `onTemplatesChanged` and storing
 * `toJSON()`, then calling `load()` on startup.
 */
export default class NodeTemplates {
  private readonly templates = new Map<string, NodeTemplate>();
  private readonly nodeflowData: NodeflowData;

  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
  }

  public get size(): number {
    return this.templates.size;
  }

  public get(id: string): NodeTemplate | undefined {
    return this.templates.get(id);
  }

  public has(id: string): boolean {
    return this.templates.has(id);
  }

  /** Templates in insertion order. */
  public list(): Array<NodeTemplate> {
    return Array.from(this.templates.values());
  }

  /** Adds or replaces a template. */
  public add(template: NodeTemplate): NodeTemplate {
    const copy = NodeTemplates.copy(template);
    this.templates.set(copy.id, copy);
    this.publishChanged();
    return copy;
  }

  /**
   * Saves a composite node as a template. Its position and connections are
   * not part of the template. Returns `undefined` for non-composite nodes.
   */
  public saveFromNode(
    nodeId: string,
    name: string,
    id: string = generateId(),
  ): NodeTemplate | undefined {
    const node = this.nodeflowData.nodes.get(nodeId);
    if (!node?.composite) return undefined;

    const {
      position: _position,
      offset: _offset,
      size: _size,
      id: _id,
      composite,
      ...rest
    } = node.serialize();

    return this.add({ id, name, definition: composite!, node: rest });
  }

  public rename(id: string, name: string): void {
    const template = this.templates.get(id);
    if (!template || template.name === name) return;
    template.name = name;
    this.publishChanged();
  }

  public remove(id: string): boolean {
    const removed = this.templates.delete(id);
    if (removed) this.publishChanged();
    return removed;
  }

  public clear(): void {
    if (this.templates.size === 0) return;
    this.templates.clear();
    this.publishChanged();
  }

  /**
   * Adds templates, e.g. ones restored from storage. With `replace`, existing
   * templates are dropped first. Publishes `onTemplatesChanged` once.
   */
  public load(
    templates: Array<NodeTemplate>,
    options: { replace?: boolean } = {},
  ): void {
    if (options.replace) this.templates.clear();
    templates.forEach((template) =>
      this.templates.set(template.id, NodeTemplates.copy(template)),
    );
    this.publishChanged();
  }

  /** JSON-safe copies of every template: `display` is stripped throughout. */
  public toJSON(): Array<NodeTemplate> {
    return this.list().map((template) => ({
      id: template.id,
      name: template.name,
      definition: stripDefinitionDisplay(template.definition),
      node: stripNodeDisplay(template.node),
    }));
  }

  private static copy(template: NodeTemplate): NodeTemplate {
    // deepCopy keeps function references, so in-memory displays survive.
    return deepCopy(template);
  }

  private publishChanged(): void {
    this.nodeflowData.eventStore.onTemplatesChanged.publish({
      templates: this.list(),
    });
  }
}
