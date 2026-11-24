import {
  Optional,
  SelectableElementCSS,
  SerializedCompositeDefinition,
  SerializedConnection,
  SerializedConnectorSection,
  SerializedNodeConnector,
  SerializedNodeflowNode,
  NodeRotation,
} from "./nodeflow-types";
import { DisplayFunc, NodeflowNodeType } from "./types";
import Vec2 from "./Vec2";
import ConnectorSection from "./ConnectorSection";
import NodeConnector from "./NodeConnector";
import type ConnectorDestination from "./ConnectorDestination";
import { deepCopy } from "./misc-utils";
import Changes from "./Changes";
import Rect from "./Rect";
import type NodeflowData from "./NodeflowData";

export default class NodeflowNodeData {
  private _centered: boolean;
  private _connectorSections: Map<string, ConnectorSection>;
  private _css: SelectableElementCSS;
  private _customData: CustomNodeflowDataType;
  private _display: DisplayFunc;
  private _id: string;
  private _offset: Vec2;
  private _position: Vec2;
  private _size: Vec2;
  private _rotation: NodeRotation;
  private _composite: SerializedCompositeDefinition | undefined;
  private readonly nodeflowData: NodeflowData;

  constructor(nodeflowData: NodeflowData, data: NodeflowNodeType) {
    this.nodeflowData = nodeflowData;
    this._centered = data.centered ?? false;
    this._connectorSections =
      data.connectorSections instanceof Map
        ? (data.connectorSections as Map<string, ConnectorSection>)
        : new Map();
    this._css = data.css ?? {};
    this._customData = data.customData ?? ({} as CustomNodeflowDataType);
    this._display = data.display ?? (() => undefined);
    this._id = data.id;
    this._offset = data.offset ?? Vec2.zero();
    this._position = data.position ?? Vec2.zero();
    this._size = data.size ?? Vec2.zero();
    this._rotation = data.rotation ?? 0;
    this._composite = data.composite;
    this._position = this.normalizedPosition(this._position);
    this.nodeflowData.chunking.addNodeToChunk(this.id, this._position);
    this.trackExtent();
  }

  /** Lets chunk queries account for this node's rendered box. */
  private trackExtent(): void {
    this.nodeflowData.chunking.trackNodeExtent(this.rectWithOffset.size);
  }

  public get nodeflow() {
    return this.nodeflowData;
  }

  public get centered(): boolean {
    return this._centered;
  }

  public get connectorSections(): Map<string, ConnectorSection> {
    return this._connectorSections;
  }

  public get css(): SelectableElementCSS {
    return this._css;
  }

  public get customData(): CustomNodeflowDataType {
    return this._customData;
  }

  public get display(): DisplayFunc {
    return this._display;
  }

  public get id(): string {
    return this._id;
  }

  public get offset(): Vec2 {
    return this._offset;
  }

  public get position(): Vec2 {
    return this._position;
  }

  public get size(): Vec2 {
    return this._size;
  }

  /** The inner graph of a composite node; `undefined` for plain nodes. */
  /** Clockwise rotation in degrees; see `NodeRotation`. */
  public get rotation(): NodeRotation {
    return this._rotation;
  }

  public set rotation(value: NodeRotation) {
    this._rotation = value;
    this.nodeflowData.publishContentChanged();
  }

  /**
   * The rotation `steps` quarter turns clockwise from the current one
   * (negative for counter-clockwise). Apply it with `NodeflowData.updateNode`
   * to make it undoable.
   */
  public rotatedBy(steps: number): NodeRotation {
    const quarters = (((this._rotation / 90 + steps) % 4) + 4) % 4;
    return (quarters * 90) as NodeRotation;
  }

  public get composite(): SerializedCompositeDefinition | undefined {
    return this._composite;
  }

  public get isComposite(): boolean {
    return this._composite !== undefined;
  }

  public set composite(value: SerializedCompositeDefinition | undefined) {
    this._composite = value;
    this.nodeflowData.publishContentChanged();
  }

  public set centered(value: boolean) {
    this._centered = value;
  }

  public set connectorSections(value: Map<string, ConnectorSection>) {
    this._connectorSections = value;
    this.nodeflowData.publishContentChanged();
  }

  public set css(value: SelectableElementCSS) {
    this._css = value;
    this.nodeflowData.publishContentChanged();
  }

  public set customData(value: CustomNodeflowDataType) {
    this._customData = value;
    this.nodeflowData.publishContentChanged();
  }

  public set display(value: DisplayFunc) {
    this._display = value;
    this.nodeflowData.publishContentChanged();
  }

  public set id(value: string) {
    this.reindexId(value);
  }

  private reindexId(value: string): void {
    if (value === this._id) return;
    this.nodeflowData.chunking.removeNodeFromChunk(this._id, this._position);
    this._id = value;
    this.nodeflowData.chunking.addNodeToChunk(this._id, this._position);
  }

  public set offset(value: Vec2) {
    this._offset = value;
    this.trackExtent();
    this.nodeflowData.publishContentChanged();
  }

  public set position(value: Vec2) {
    const oldPos = this._position;
    this._position = this.nodeflowData.snapPositionToGrid(value);
    this.checkAndResolveCollisions();
    this.nodeflowData.chunking.updateNodeInChunk(
      this.id,
      oldPos,
      this._position,
    );
    this.clampToBoundary();
    this.nodeflowData.publishContentChanged();
  }

  public set size(value: Vec2) {
    this._size = value;
    this.trackExtent();
    this.clampToBoundary();
    this.nodeflowData.publishContentChanged();
  }

  public updateMeasurements(size: Vec2, offset: Vec2): void {
    this._size = size;
    this._offset = offset;
    this.trackExtent();
    // The node's extent is only known after the adapter measures the DOM, so a
    // node placed near a boundary edge is pushed fully inside here.
    this.clampToBoundary();
    this.nodeflowData.publishContentChanged();
  }

  /**
   * The range `position` may take so the rendered box
   * (`position` to `position + size + 2 * offset`) stays inside
   * `settings.nodeBoundary`. `high < low` on an axis means the node is larger
   * than the boundary on that axis. `undefined` when no boundary is set.
   */
  public getBoundaryTravel(): { low: Vec2; high: Vec2 } | undefined {
    const boundary = this.nodeflowData.settings.nodeBoundary;
    if (!boundary) return undefined;

    const min = boundary.startPosition();
    const max = boundary.endPosition();
    const box = this._size.add(this._offset.multiplyBy(2));

    return { low: min, high: max.subtract(box) };
  }

  private clampedPosition(position: Vec2): Vec2 {
    const travel = this.getBoundaryTravel();
    if (!travel) return position;

    // `low` wins when the node is oversized, pinning it to the top-left corner.
    const pin = (value: number, low: number, high: number): number =>
      Math.max(Math.min(value, high), low);

    return Vec2.of(
      pin(position.x, travel.low.x, travel.high.x),
      pin(position.y, travel.low.y, travel.high.y),
    );
  }

  /**
   * Snaps `position` to the grid (when `settings.snapNodePositionToGrid` is
   * on), then clamps it into `settings.nodeBoundary`, so the boundary wins.
   */
  private normalizedPosition(position: Vec2): Vec2 {
    return this.clampedPosition(
      this.nodeflowData.snapPositionToGrid(position),
    );
  }

  /**
   * Moves the node back onto the grid and inside `settings.nodeBoundary` if
   * it has left either. Returns whether the position changed.
   */
  public clampToBoundary(): boolean {
    const next = this.normalizedPosition(this._position);
    if (next.equals(this._position)) return false;

    const oldPos = this._position;
    this._position = next;
    this.nodeflowData.chunking.updateNodeInChunk(this.id, oldPos, next);
    this.nodeflowData.publishContentChanged();

    return true;
  }

  /**
   * One-shot center→top-left conversion for `centered` nodes. Clears the flag
   * so a serialize/deserialize round-trip (undo/redo) does not re-apply it.
   */
  public applyCenteringOffset(offset: Vec2): void {
    if (!this._centered) {
      return;
    }

    this.update({
      centered: false,
      position: this._position.subtract(offset),
    });
  }

  public get sizeWithOffset(): Vec2 {
    return this._size.add(this._offset);
  }

  /**
   * Imperatively resolves collisions between this node and any overlapping nodes.
   * Pushes this node away from any colliding node.
   * Uses this._position directly (not the setter) to avoid infinite recursion.
   */
  public checkAndResolveCollisions(): void {
    const collidingNodes = this.getCollidingNodes();
    if (collidingNodes.length > 0) {
      collidingNodes.forEach((nodeId) => {
        const node = this.nodeflowData.nodes.get(nodeId);
        if (node) {
          const nodeRect = node.rectWithOffset;
          const thisRect = this.rectWithOffset;
          if (nodeRect.intersects(thisRect)) {
            const distance = nodeRect.center.subtract(
              thisRect.center,
            ).magnitude;
            const direction = nodeRect.center
              .subtract(thisRect.center)
              .normalize();
            this._position = this._position.subtract(
              direction.multiplyBy(distance),
            );
          }
        }
      });
    }
  }

  public update(data: Partial<NodeflowNodeType>): void {
    // Undoing `NodeflowData.updateNode` passes back serialized `{ x, y }`s.
    const toVec2 = (value: Vec2 | undefined) =>
      value === undefined || value instanceof Vec2
        ? value
        : Vec2.deserialize(value);
    data = {
      ...data,
      offset: toVec2(data.offset),
      position: toVec2(data.position),
      size: toVec2(data.size),
    };
    if (data.centered !== undefined) this._centered = data.centered;
    if (data.connectorSections !== undefined)
      this._connectorSections = data.connectorSections as Map<
        string,
        ConnectorSection
      >;
    if (data.css !== undefined) this._css = data.css;
    if (data.customData !== undefined) this._customData = data.customData;
    if (data.display !== undefined) this._display = data.display;
    if (data.id !== undefined) this.reindexId(data.id);
    if (data.offset !== undefined) this._offset = data.offset;
    if (data.size !== undefined) this._size = data.size;
    if (data.rotation !== undefined) this._rotation = data.rotation;
    if (data.composite !== undefined) this._composite = data.composite;
    if (data.size !== undefined || data.offset !== undefined) {
      this.trackExtent();
    }
    if (data.position !== undefined) {
      const oldPos = this._position;
      this._position = this.nodeflowData.snapPositionToGrid(data.position);
      this.checkAndResolveCollisions();
      this.nodeflowData.chunking.updateNodeInChunk(
        this.id,
        oldPos,
        this._position,
      );
    }
    if (
      data.position !== undefined ||
      data.size !== undefined ||
      data.offset !== undefined
    ) {
      this.clampToBoundary();
    }

    this.nodeflowData.publishContentChanged();
  }

  public updateWithPrevious(
    updater: (data: NodeflowNodeType) => Partial<NodeflowNodeType>,
  ): void {
    const current: NodeflowNodeType = {
      centered: this._centered,
      connectorSections: this._connectorSections,
      css: this._css,
      customData: this._customData,
      display: this._display,
      id: this._id,
      offset: this._offset,
      position: this._position,
      size: this._size,
      rotation: this._rotation,
      composite: this._composite,
    };
    const updates = updater(current);
    this.update(updates);
  }

  public serialize(): SerializedNodeflowNode {
    const serializedConnectorSections = Array.from(
      this._connectorSections.values(),
    ).reduce(
      (sections, section) => {
        sections[section.id] = section.serialize();
        return sections;
      },
      {} as Record<string, SerializedConnectorSection>,
    );

    return {
      centered: this._centered,
      connectorSections: serializedConnectorSections,
      css: deepCopy(this._css),
      customData: deepCopy(this._customData),
      id: this._id,
      display: this._display,
      offset: this._offset.serialize(),
      position: this._position.serialize(),
      size: this._size.serialize(),
      rotation: this._rotation,
      ...(this._composite && { composite: deepCopy(this._composite) }),
    };
  }

  public static deserialize(
    nodeflowData: NodeflowData,
    data: Partial<SerializedNodeflowNode>,
    hasHistoryGroup: string | boolean = true,
  ): NodeflowNodeData {
    const id = data.id ?? nodeflowData.getNextFreeNodeId();

    const node = new NodeflowNodeData(nodeflowData, {
      centered: data.centered ?? false,
      connectorSections: new Map<string, ConnectorSection>(),
      css: deepCopy(data.css) ?? {},
      customData: deepCopy(data.customData) ?? ({} as CustomNodeflowDataType),
      display:
        data.display ??
        nodeflowData.settings.resolveNodeDisplay?.(data) ??
        (() => undefined),
      id,
      offset: Vec2.deserializeOrDefault(data.offset),
      position: Vec2.deserializeOrDefault(data.position),
      size: Vec2.deserializeOrDefault(data.size),
      rotation: data.rotation ?? 0,
      composite: deepCopy(data.composite),
    });

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    Object.entries(data.connectorSections ?? []).forEach(
      ([sectionId, section]) => {
        node.addConnectorSection(
          {
            css: section.css,
            id: sectionId,
            connectors: section.connectors,
          },
          historyGroup,
        );
      },
    );

    return node;
  }

  public serializeConnections(): Array<SerializedConnection> {
    return Array.from(this._connectorSections.values()).flatMap((section) =>
      Array.from(section.connectors.values()).flatMap((connector) =>
        connector.serializeConnections(),
      ),
    );
  }

  public addConnectorSection(
    data: Partial<SerializedConnectorSection>,
    hasHistoryGroup: string | boolean = true,
  ): ConnectorSection {
    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);
    const section = ConnectorSection.deserialize(data, this, historyGroup);

    if (this._connectorSections.has(section.id)) {
      return this._connectorSections.get(section.id)!;
    }

    if (historyGroup) {
      const serializedConnector = section.serialize();
      const nodeflowData = this.nodeflowData;
      const nodeId = this.id;
      const sectionId = serializedConnector.id;

      this.nodeflowData.changes.addChange({
        type: "remove",
        source: "connector-section",
        applyChange: () => {
          nodeflowData.nodes
            .get(nodeId)
            ?.addConnectorSection(serializedConnector, false);
        },
        undoChange: () => {
          nodeflowData.nodes
            .get(nodeId)
            ?.removeConnectorSection(sectionId, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this._connectorSections.set(section.id, section);
    this.nodeflowData.publishContentChanged();

    return section;
  }

  public removeConnectorSection(
    sectionId: string,
    hasHistoryGroup: string | boolean = true,
  ): void {
    if (!this._connectorSections.has(sectionId)) {
      return;
    }
    const section = this._connectorSections.get(sectionId)!;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const serializedSection = section.serialize();
      const nodeflowData = this.nodeflowData;
      const nodeId = this.id;

      this.nodeflowData.changes.addChange({
        type: "remove",
        source: "connector-section",
        applyChange: () => {
          nodeflowData.nodes
            .get(nodeId)
            ?.removeConnectorSection(sectionId, false);
        },
        undoChange: () => {
          nodeflowData.nodes
            .get(nodeId)
            ?.addConnectorSection(serializedSection, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this._connectorSections.delete(sectionId);
    this.nodeflowData.publishContentChanged();
  }

  public getConnectorCount(): number {
    return Array.from(this._connectorSections.values()).reduce(
      (total, section) => total + section.connectors.size,
      0,
    );
  }

  public addConnector(
    sectionId: string,
    data: Partial<SerializedNodeConnector>,
    hasHistoryGroup: string | boolean = true,
  ): NodeConnector | undefined {
    if (!this._connectorSections.has(sectionId)) {
      return;
    }

    return this._connectorSections
      .get(sectionId)!
      .addConnector(data, hasHistoryGroup);
  }

  public removeConnector(
    sectionId: string,
    connectorId: string,
    hasHistoryGroup: string | boolean = true,
  ): void {
    if (!this._connectorSections.has(sectionId)) {
      return;
    }

    this._connectorSections
      .get(sectionId)!
      .removeConnector(connectorId, hasHistoryGroup);
  }

  public getConnector(connectorId: string): Optional<NodeConnector> {
    return this.getSectionFromConnector(connectorId)?.connectors.get(
      connectorId,
    );
  }

  /**
   * @param connectorId - the id of the connector
   * @returns the total number of connections coming into the specified connector
   */
  public getTotalConnectedInputs(connectorId: string): number {
    return this.getConnector(connectorId)?.sources.length ?? 0;
  }

  public getAllConnectors(): NodeConnector[] {
    const out: NodeConnector[] = [];

    for (const section of this._connectorSections.values()) {
      for (const connector of section.connectors.values()) {
        out.push(connector);
      }
    }

    return out;
  }

  public getNextFreeConnectorSectionId(): string {
    let newId = "0";

    for (let i = 1; this._connectorSections.has(newId); ++i) {
      newId = i.toString();
    }

    return newId;
  }

  public getNextFreeConnectorId(): string {
    let newId = "0";

    for (
      let i = 1;
      Array.from(this._connectorSections.values()).some((section) =>
        section.connectors.has(newId),
      );
      ++i
    ) {
      newId = i.toString();
    }

    return newId;
  }

  /**
   * Removes all connections going into the current node.
   */
  public removeIncomingConnections(): void {
    this._connectorSections.forEach((section) =>
      section.removeIncomingConnections(),
    );
  }

  /**
   * Removes all connections going out of the current node.
   */
  public removeOutgoingConnections(): void {
    this._connectorSections.forEach((section) =>
      section.removeOutgoingConnections(),
    );
  }

  public getAllSourceConnectors(): NodeConnector[] {
    return Array.from(this._connectorSections.values()).reduce(
      (connectors, section) => connectors.concat(section.getSourceConnectors()),
      [] as NodeConnector[],
    );
  }

  public getAllDestinationConnectors(): NodeConnector[] {
    return Array.from(this._connectorSections.values()).reduce(
      (connectors, section) =>
        connectors.concat(section.getDestinationConnectors()),
      [] as NodeConnector[],
    );
  }

  public getAllSourceConnections(): SerializedConnection[] {
    const out: SerializedConnection[] = [];

    this._connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.sources.forEach(({ sourceConnector }) => {
          // The connection's styling lives on the source side.
          const destination = sourceConnector.destinations.find(
            (candidate: ConnectorDestination) =>
              candidate.destinationConnector === connector,
          );
          if (!destination) return;

          out.push({
            sourceNodeId: sourceConnector.parentNode.id,
            sourceConnectorId: sourceConnector.id,
            destinationNodeId: this.id,
            destinationConnectorId: connector.id,
            css: destination.css,
            shape: destination.shape,
            dash: destination.dash,
          });
        });
      });
    });

    return out;
  }

  public getAllDestinationConnections(): SerializedConnection[] {
    const out: SerializedConnection[] = [];

    this._connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.destinations.forEach((destination) => {
          out.push({
            sourceNodeId: this.id,
            sourceConnectorId: connector.id,
            destinationNodeId: destination.destinationConnector.parentNode.id,
            destinationConnectorId: destination.destinationConnector.id,
            css: destination.css,
            shape: destination.shape,
            dash: destination.dash,
          });
        });
      });
    });

    return out;
  }

  public getAllSourceNodes(): NodeflowNodeData[] {
    return this.getAllSourceConnectors().map((source) => source.parentNode);
  }

  public getAllDestinationNodes(): NodeflowNodeData[] {
    return this.getAllDestinationConnectors().map(
      (destination) => destination.parentNode,
    );
  }

  public getSectionFromConnector(
    connectorId: string,
  ): Optional<ConnectorSection> {
    return Array.from(this._connectorSections.values()).find((section) =>
      section.connectors.get(connectorId),
    );
  }

  public getCenter(): Vec2 {
    return this._position.add(this._offset, this._size.divideBy(2));
  }

  public select(position?: Vec2): void {
    this.nodeflowData.selectNode(this._id, position);
  }

  public get rect(): Rect {
    return Rect.of(this._position, this._size);
  }

  public get rectWithOffset(): Rect {
    return Rect.of(
      this._position.subtract(this._offset),
      this._size.add(this._offset.multiplyBy(2)),
    );
  }

  public getCollidingNodes(): string[] {
    // TODO: This gets called every time the node's position changes. Look into optimizing this.
    return this.nodeflowData.chunking.checkForCollisions(this._id);
  }

  public isColliding(): boolean {
    return this.getCollidingNodes().length > 0;
  }
}
