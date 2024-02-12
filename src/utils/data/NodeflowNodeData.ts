import {
  NodeflowNodeType,
  Optional,
  SerializedConnection,
  SerializedConnectorSection,
  SerializedNodeConnector,
  SerializedNodeflowNode,
} from "../../nodeflow-types";
import { createStore } from "solid-js/store";
import Vec2 from "./Vec2";
import ConnectorSection from "./ConnectorSection";
import { ReactiveMap } from "@solid-primitives/map";
import NodeConnector from "./NodeConnector";
import { deepCopy } from "../misc-utils";
import { NodeflowData } from "./index";
import Changes from "./Changes";
import NodeflowLib from "../NodeflowLib";

export default class NodeflowNodeData {
  private readonly store;
  private readonly nodeflowData;

  constructor(nodeflowData: NodeflowData, data: NodeflowNodeType) {
    this.nodeflowData = nodeflowData;
    this.store = createStore<NodeflowNodeType>(data);
  }

  public get centered() {
    return this.store[0].centered;
  }

  public get connectorSections() {
    return this.store[0].connectorSections;
  }

  public get css() {
    return this.store[0].css;
  }

  public get customData() {
    return this.store[0].customData;
  }

  public get display() {
    return this.store[0].display;
  }

  public get id() {
    return this.store[0].id;
  }

  public get offset() {
    return this.store[0].offset;
  }

  public get position() {
    return this.store[0].position;
  }

  public get ref() {
    return this.store[0].ref;
  }

  public get resizeObserver() {
    return this.store[0].resizeObserver;
  }

  public get size() {
    return this.store[0].size;
  }

  public set centered(value) {
    this.store[1]({ centered: value });
  }

  public set connectorSections(value) {
    this.store[1]({ connectorSections: value });
  }

  public set css(value) {
    this.store[1]({ css: value });
  }

  public set customData(value) {
    this.store[1]({ customData: value });
  }

  public set display(value) {
    this.store[1]({ display: value });
  }

  public set id(value) {
    this.store[1]({ id: value });
  }

  public set offset(value) {
    this.store[1]({ offset: value });
  }

  public set position(value) {
    this.store[1]({ position: value });
  }

  public set ref(value) {
    this.store[1]({ ref: value });
  }

  public set resizeObserver(value) {
    this.store[1]({ resizeObserver: value });
  }

  public set size(value) {
    this.store[1]({ size: value });
  }

  public update(data: Partial<NodeflowNodeType>) {
    this.store[1](data);
  }

  public serialize(): SerializedNodeflowNode {
    const serializedConnectorSections = Array.from(
      this.connectorSections.values(),
    ).reduce(
      (sections, section) => {
        sections[section.id] = section.serialize();
        return sections;
      },
      {} as Record<string, SerializedConnectorSection>,
    );

    return {
      centered: this.centered,
      connectorSections: serializedConnectorSections,
      css: deepCopy(this.css),
      customData: deepCopy(this.customData),
      id: this.id,
      display: this.display,
      position: this.position.serialize(),
    };
  }

  public static deserialize(
    nodeflowData: NodeflowData,
    data: Partial<SerializedNodeflowNode>,
    hasHistoryGroup: string | boolean = true,
  ) {
    const id = data.id ?? nodeflowData.getNextFreeNodeId();

    const node = new NodeflowNodeData(nodeflowData, {
      centered: data.centered ?? false,
      connectorSections: new ReactiveMap<string, ConnectorSection>(),
      css: deepCopy(data.css) ?? {},
      customData: deepCopy(data.customData) ?? ({} as CustomNodeflowDataType),
      display: data.display ?? (() => undefined),
      id,
      offset: Vec2.zero(),
      position: Vec2.deserializeOrDefault(data.position),
      ref: undefined,
      resizeObserver: undefined,
      size: Vec2.zero(),
    });

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    Object.entries(data.connectorSections ?? []).forEach(
      ([sectionId, section]) => {
        node.addConnectorSection(sectionId, section.css, historyGroup);

        Object.values(section.connectors).forEach((connector) => {
          node.addConnector(sectionId, connector, historyGroup);
        });
      },
    );

    return node;
  }

  public serializeConnections(): Array<SerializedConnection> {
    return Array.from(this.connectorSections.values()).flatMap((section) =>
      Array.from(section.connectors.values()).flatMap((connector) =>
        connector.serializeConnections(),
      ),
    );
  }

  public updateWithPrevious(
    updater: (data: NodeflowNodeType) => Partial<NodeflowNodeType>,
  ) {
    this.store[1](updater);
  }

  public addConnectorSection(
    sectionId?: string,
    css?: string,
    hasHistoryGroup: string | boolean = true,
  ): ConnectorSection {
    if (!sectionId || this.connectorSections.has(sectionId)) {
      sectionId = this.getNextFreeConnectorSectionId();
    }

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const nodeflowId = this.nodeflowData.id;
      const nodeId = this.id;

      this.nodeflowData.changes.addChange({
        type: "remove",
        source: "connector-section",
        applyChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.addConnectorSection(sectionId, css, false);
        },
        undoChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.removeConnectorSection(sectionId!, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    const section = new ConnectorSection(this.nodeflowData, {
      connectors: new ReactiveMap<string, NodeConnector>(),
      css,
      id: sectionId,
      parentNode: this,
    });

    this.connectorSections.set(sectionId, section);

    return section;
  }

  public removeConnectorSection(
    sectionId: string,
    hasHistoryGroup: string | boolean = true,
  ) {
    if (!this.connectorSections.has(sectionId)) {
      return;
    }
    const section = this.connectorSections.get(sectionId)!;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const nodeflowId = this.nodeflowData.id;
      const sectionCss = section.css;
      const nodeId = this.id;

      this.nodeflowData.changes.addChange({
        type: "remove",
        source: "connector-section",
        applyChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.removeConnectorSection(sectionId!, false);
        },
        undoChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.addConnectorSection(sectionId, sectionCss, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this.connectorSections.delete(sectionId);
  }

  public getConnectorCount() {
    return Array.from(this.connectorSections.values()).reduce(
      (total, section) => total + section.connectors.size,
      0,
    );
  }

  public addConnector(
    sectionId: string,
    data: Partial<SerializedNodeConnector>,
    hasHistoryGroup: string | boolean = true,
  ) {
    if (!this.connectorSections.has(sectionId)) {
      return;
    }

    return this.connectorSections
      .get(sectionId)!
      .addConnector(data, hasHistoryGroup);
  }

  public removeConnector(
    sectionId: string,
    connectorId: string,
    hasHistoryGroup: string | boolean = true,
  ) {
    if (!this.connectorSections.has(sectionId)) {
      return;
    }

    this.connectorSections
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
  public getTotalConnectedInputs(connectorId: string) {
    return this.getConnector(connectorId)?.sources.length ?? 0;
  }

  public getAllConnectors(): NodeConnector[] {
    return Array.from(this.connectorSections.values()).reduce(
      (connectors, section) =>
        connectors.concat(Array.from(section.connectors.values())),
      [] as NodeConnector[],
    );
  }

  public getNextFreeConnectorSectionId(): string {
    let newId = "0";

    for (let i = 1; this.connectorSections.has(newId); ++i) {
      newId = i.toString();
    }

    return newId;
  }

  public getNextFreeConnectorId(): string {
    let newId = "0";

    for (
      let i = 1;
      Array.from(this.connectorSections.values()).some((section) =>
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
  public removeIncomingConnections() {
    this.connectorSections.forEach((section) =>
      section.removeIncomingConnections(),
    );
  }

  /**
   * Removes all connections going out of the current node.
   */
  public removeOutgoingConnections() {
    this.connectorSections.forEach((section) =>
      section.removeOutgoingConnections(),
    );
  }

  public getAllSourceConnectors(): NodeConnector[] {
    return Array.from(this.connectorSections.values()).reduce(
      (connectors, section) => connectors.concat(section.getSourceConnectors()),
      [] as NodeConnector[],
    );
  }

  public getAllDestinationConnectors(): NodeConnector[] {
    return Array.from(this.connectorSections.values()).reduce(
      (connectors, section) =>
        connectors.concat(section.getDestinationConnectors()),
      [] as NodeConnector[],
    );
  }

  public getAllSourceConnections(): SerializedConnection[] {
    return this.getAllSourceConnectors()
      .map((source) => {
        const filteredDestinations = source.destinations.filter(
          (destination) =>
            destination.destinationConnector.parentSection.parentNode.id ===
            this.id,
        );

        return filteredDestinations.map(
          (destination): SerializedConnection => ({
            sourceNodeId: source.parentSection.parentNode.id,
            sourceConnectorId: source.id,
            destinationNodeId:
              destination.destinationConnector.parentSection.parentNode.id,
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
          (source) =>
            source.sourceConnector.parentSection.parentNode.id === this.id,
        );
        return filteredSources.map(
          (source): SerializedConnection => ({
            sourceNodeId: source.sourceConnector.parentSection.parentNode.id,
            sourceConnectorId: source.sourceConnector.id,
            destinationNodeId: destination.parentSection.parentNode.id,
            destinationConnectorId: destination.id,
          }),
        );
      })
      .flat();
  }

  public getSectionFromConnector(
    connectorId: string,
  ): Optional<ConnectorSection> {
    return Array.from(this.connectorSections.values()).find((section) =>
      section.connectors.get(connectorId),
    );
  }

  public getCenter(): Vec2 {
    return this.position.add(this.offset).add(this.size.divideBy(2));
  }
}
