import Vec2 from "./Vec2";
import Rect from "./Rect";
import { deepCopy } from "./misc-utils";
import type NodeflowData from "./NodeflowData";
import type NodeflowNodeData from "./NodeflowNodeData";
import type {
  NodeflowGroupCss,
  SerializedNodeflowGroup,
} from "./nodeflow-types";

/** Size of a collapsed group's box until an adapter measures it. */
export const DEFAULT_COLLAPSED_GROUP_SIZE = Vec2.of(180, 56);

/**
 * A visual container around a set of nodes. Expanded, it draws a frame
 * around its members; collapsed, the members are hidden and the group is
 * drawn as a single box, with connections to the outside attached to it.
 * Grouping never changes the graph itself.
 *
 * Mutate groups through `NodeflowData` (`addGroup`, `updateGroup`,
 * `setGroupCollapsed`, ...) so changes are recorded for undo.
 */
export default class NodeflowGroupData {
  public readonly id: string;
  private _title: string = "";
  private _nodeIds: Set<string> = new Set();
  private _collapsed: boolean = false;
  private _css: NodeflowGroupCss = {};
  private _customData: Record<string, unknown> = {};
  private _collapsedSize: Vec2 = DEFAULT_COLLAPSED_GROUP_SIZE;
  private readonly nodeflowData: NodeflowData;

  public constructor(nodeflowData: NodeflowData, data: SerializedNodeflowGroup) {
    this.nodeflowData = nodeflowData;
    this.id = data.id;
    this.apply(data);
  }

  /** Replaces the group's state. Used by `NodeflowData`; prefer its methods. */
  public apply(data: SerializedNodeflowGroup): void {
    this._title = data.title;
    this._nodeIds = new Set(data.nodeIds);
    this._collapsed = data.collapsed;
    this._css = deepCopy(data.css) ?? {};
    this._customData = deepCopy(data.customData) ?? {};
  }

  public get title(): string {
    return this._title;
  }

  public get nodeIds(): ReadonlySet<string> {
    return this._nodeIds;
  }

  public get collapsed(): boolean {
    return this._collapsed;
  }

  public get css(): NodeflowGroupCss {
    return this._css;
  }

  public get customData(): Record<string, unknown> {
    return this._customData;
  }

  public get collapsedSize(): Vec2 {
    return this._collapsedSize;
  }

  /** Member nodes that currently exist. */
  public get members(): Array<NodeflowNodeData> {
    const out: Array<NodeflowNodeData> = [];
    this._nodeIds.forEach((id) => {
      const node = this.nodeflowData.nodes.get(id);
      if (node) out.push(node);
    });
    return out;
  }

  /** Union of the members' rendered boxes, or `undefined` with no members. */
  public getMemberBounds(): Rect | undefined {
    const members = this.members;
    if (members.length === 0) return undefined;

    let min = Vec2.of(Infinity, Infinity);
    let max = Vec2.of(-Infinity, -Infinity);

    members.forEach((node) => {
      const rect = node.rectWithOffset;
      const end = rect.position.add(rect.size);
      min = Vec2.of(
        Math.min(min.x, rect.position.x),
        Math.min(min.y, rect.position.y),
      );
      max = Vec2.of(Math.max(max.x, end.x), Math.max(max.y, end.y));
    });

    return Rect.fromPositions(min, max);
  }

  /**
   * The expanded frame: member bounds grown by `settings.groupPadding`, with
   * `settings.groupHeaderHeight` added on top for the header.
   */
  public getBounds(): Rect | undefined {
    const members = this.getMemberBounds();
    if (!members) return undefined;

    const { groupPadding, groupHeaderHeight } = this.nodeflowData.settings;
    const padding = Math.max(groupPadding, 0);
    const header = Math.max(groupHeaderHeight, 0);

    return Rect.fromPositions(
      members.position.subtract(Vec2.of(padding, padding + header)),
      members.position.add(members.size, Vec2.of(padding, padding)),
    );
  }

  /** The collapsed box, anchored at the expanded frame's top-left corner. */
  public getCollapsedRect(): Rect | undefined {
    const bounds = this.getBounds();
    return bounds ? Rect.of(bounds.position, this._collapsedSize) : undefined;
  }

  /** The box the group currently occupies on the canvas. */
  public getRect(): Rect | undefined {
    return this._collapsed ? this.getCollapsedRect() : this.getBounds();
  }

  /** Whether every member is selected. */
  public isSelected(): boolean {
    const members = this.members;
    return (
      members.length > 0 &&
      members.every((node) =>
        this.nodeflowData.mouseData.hasSelectedNode(node.id),
      )
    );
  }

  /** Called by adapters once they have measured the collapsed box. */
  public updateCollapsedSize(size: Vec2): void {
    if (size.x <= 0 || size.y <= 0 || size.equals(this._collapsedSize)) return;
    this._collapsedSize = size;
    this.nodeflowData.publishContentChanged();
  }

  public serialize(): SerializedNodeflowGroup {
    return {
      id: this.id,
      title: this._title,
      nodeIds: Array.from(this._nodeIds),
      collapsed: this._collapsed,
      css: deepCopy(this._css),
      customData: deepCopy(this._customData),
    };
  }
}
