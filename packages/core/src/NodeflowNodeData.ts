import {
  Optional,
  SelectableElementCSS,
  SerializedConnection,
  SerializedConnectorSection,
  SerializedNodeConnector,
  SerializedNodeflowNode,
} from "./nodeflow-types";
import { NodeflowNodeType } from "./types";
import Vec2 from "./Vec2";
import ConnectorSection from "./ConnectorSection";
import NodeConnector from "./NodeConnector";
import { deepCopy } from "./misc-utils";
import Changes from "./Changes";
import Rect from "./Rect";
import type NodeflowData from "./NodeflowData";

export default class NodeflowNodeData {
  private _centered: boolean;
  private _connectorSections: Map<string, ConnectorSection>;
  private _css: SelectableElementCSS;
  private _customData: CustomNodeflowDataType;
  private _display: any;
  private _id: string;
  private _offset: Vec2;
  private _position: Vec2;
  private _size: Vec2;
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
    this.nodeflowData.chunking.addNodeToChunk(this.id, this.getCenter());
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

  public get display(): any {
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

  public set centered(value: boolean) {
    this._centered = value;
  }

  public set connectorSections(value: Map<string, ConnectorSection>) {
    this._connectorSections = value;
  }

  public set css(value: SelectableElementCSS) {
    this._css = value;
  }

  public set customData(value: CustomNodeflowDataType) {
    this._customData = value;
  }

  public set display(value: any) {
    this._display = value;
  }

  public set id(value: string) {
    this._id = value;
  }

  public set offset(value: Vec2) {
    this._offset = value;
  }

  public set position(value: Vec2) {
    const oldPos = this._position;
    this._position = value;
    this.nodeflowData.chunking.updateNodeInChunk(this.id, oldPos, value);
    this.checkAndResolveCollisions();
  }

  public set size(value: Vec2) {
    this._size = value;
  }

  public updateMeasurements(size: Vec2, offset: Vec2): void {
    this._size = size;
    this._offset = offset;
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
    if (data.centered !== undefined) this._centered = data.centered;
    if (data.connectorSections !== undefined)
      this._connectorSections = data.connectorSections as Map<
        string,
        ConnectorSection
      >;
    if (data.css !== undefined) this._css = data.css;
    if (data.customData !== undefined) this._customData = data.customData;
    if (data.display !== undefined) this._display = data.display;
    if (data.id !== undefined) this._id = data.id;
    if (data.offset !== undefined) this._offset = data.offset;
    if (data.size !== undefined) this._size = data.size;
    if (data.position !== undefined) {
      const oldPos = this._position;
      this._position = data.position;
      this.nodeflowData.chunking.updateNodeInChunk(
        this.id,
        oldPos,
        data.position,
      );
      this.checkAndResolveCollisions();
    }
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
      position: this._position.serialize(),
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
      display: data.display ?? (() => undefined),
      id,
      offset: Vec2.zero(),
      position: Vec2.deserializeOrDefault(data.position),
      size: Vec2.zero(),
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
    return Array.from(this._connectorSections.values()).reduce(
      (connectors, section) =>
        connectors.concat(Array.from(section.connectors.values())),
      [] as NodeConnector[],
    );
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
    return this.getAllSourceConnectors()
      .map((source) => {
        const filteredDestinations = source.destinations.filter(
          (destination: any) =>
            destination.destinationConnector.parentNode.id === this.id,
        );

        return filteredDestinations.map(
          (destination: any): SerializedConnection => ({
            sourceNodeId: source.parentNode.id,
            sourceConnectorId: source.id,
            destinationNodeId: destination.destinationConnector.parentNode.id,
            destinationConnectorId: destination.destinationConnector.id,
            css: destination.css,
          }),
        );
      })
      .flat();
  }

  public getAllDestinationConnections(): SerializedConnection[] {
    return this.getAllDestinationConnectors()
      .map((destination) => {
        const filteredSources = destination.sources.filter(
          (source: any) => source.sourceConnector.parentNode.id === this.id,
        );
        return filteredSources.map(
          (source: any): SerializedConnection => ({
            sourceNodeId: source.sourceConnector.parentNode.id,
            sourceConnectorId: source.sourceConnector.id,
            destinationNodeId: destination.parentNode.id,
            destinationConnectorId: destination.id,
          }),
        );
      })
      .flat();
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
