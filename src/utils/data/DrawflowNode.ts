import {
  DrawflowNode as DrawflowNodeData,
  Optional,
} from "../../drawflow-types";
import { createStore } from "solid-js/store";
import Vec2 from "./Vec2";
import { drawflow } from "../drawflow-storage";
import ConnectorSection from "./ConnectorSection";
import { ReactiveMap } from "@solid-primitives/map";
import NodeConnector from "./NodeConnector";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorDestination from "./ConnectorDestination";
import ConnectorSource from "./ConnectorSource";
import { breakApartObjectRecursively } from "../misc-utils";

export default class DrawflowNode {
  private readonly store;

  constructor(data: DrawflowNodeData) {
    this.store = createStore<DrawflowNodeData>(data);
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

  public update(data: Partial<DrawflowNodeData>) {
    this.store[1](data);
  }

  public asObject(): DrawflowNodeData {
    return breakApartObjectRecursively(this.store[0]);
  }

  public updateWithPrevious(
    updater: (data: DrawflowNodeData) => Partial<DrawflowNodeData>,
  ) {
    this.store[1](updater);
  }

  public static updateHeldNodePosition(moveSpeed: Vec2) {
    const id = drawflow.mouseData.heldNodeId;

    if (!id || !drawflow.nodes.has(id)) return;

    const node = drawflow.nodes.get(id)!;

    node.updateWithPrevious((prev) =>
      // TODO: check if this makes sense:
      // const newPosition = prev.position.add(
      //   moveSpeed.divideBy(drawflow.zoomLevel),
      // );

      ({
        position: prev.position.add(moveSpeed),
      }),
    );
  }

  public addConnectorSection = (
    sectionId?: string,
    css?: string,
    addToHistory = true,
  ) => {
    if (!sectionId || this.connectorSections.has(sectionId)) {
      sectionId = this.getNextFreeConnectorSectionId();
    }

    if (addToHistory) {
      drawflow.changes.addChange({
        type: "remove",
        source: "connector-section",
        applyChange: () => {
          this.addConnectorSection(sectionId, css, false);
        },
        undoChange: () => {
          this.removeConnectorSection(sectionId!, false);
        },
      });
    }

    this.connectorSections.set(
      sectionId,
      new ConnectorSection({
        connectors: new ReactiveMap<string, NodeConnector>(),
        css,
        id: sectionId,
        parentNode: this,
      }),
    );
  };

  public removeConnectorSection(sectionId: string, addToHistory = true) {
    if (!this.connectorSections.has(sectionId)) {
      return;
    }
    const section = this.connectorSections.get(sectionId)!;

    if (addToHistory) {
      drawflow.changes.addChange({
        type: "remove",
        source: "connector-section",
        applyChange: () => {
          this.removeConnectorSection(sectionId, false);
        },
        undoChange: () => {
          this.addConnectorSection(sectionId, section.css, false);
        },
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
    connectorId: Optional<string>,
    data: Partial<NodeConnector>,
    addToHistory = true,
  ) {
    if (!this.connectorSections.has(sectionId)) {
      return;
    }
    const section = this.connectorSections.get(sectionId)!;

    if (!connectorId || section.connectors.has(connectorId)) {
      connectorId = this.getNextFreeConnectorId();
    }

    if (this.getConnector(connectorId)) {
      return;
    }

    if (addToHistory) {
      drawflow.changes.addChange({
        type: "add",
        source: "connector",
        applyChange: () => {
          this.addConnector(sectionId, connectorId, data, false);
        },
        undoChange: () => {
          this.removeConnector(sectionId, connectorId!, false);
        },
      });
    }

    section.connectors.set(
      connectorId,
      new NodeConnector({
        resizeObserver: undefined,
        css: data?.css,
        destinations:
          data?.destinations ?? new ArrayWrapper<ConnectorDestination>([]),
        hovered: data?.hovered ?? false,
        id: connectorId,
        parentSection: section,
        position: data?.position ?? Vec2.zero(),
        ref: undefined,
        size: Vec2.zero(),
        sources: data?.sources ?? new ArrayWrapper<ConnectorSource>([]),
      }),
    );
  }

  public removeConnector(
    sectionId: string,
    connectorId: string,
    addToHistory = true,
  ) {
    if (!this.connectorSections.has(sectionId)) {
      return;
    }
    const section = this.connectorSections.get(sectionId)!;

    if (!section.connectors.has(connectorId)) {
      return;
    }
    const connector = section.connectors.get(connectorId)!;

    if (addToHistory) {
      drawflow.changes.addChange({
        type: "remove",
        source: "connector",
        applyChange: () => {
          this.removeConnector(sectionId, connectorId, false);
        },
        undoChange: () => {
          this.addConnector(sectionId, connectorId, connector, false);
        },
      });
    }

    section.connectors.delete(connectorId);
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

  public removeIncomingConnections() {
    this.connectorSections.forEach((section) =>
      section.removeIncomingConnections(),
    );
  }

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

  public getAllSourceConnections() {
    return this.getAllSourceConnectors()
      .map((source) => {
        const filteredDestinations = source.destinations.filter(
          (destination) =>
            destination.destinationConnector.parentSection.parentNode.id ===
            this.id,
        );
        return filteredDestinations.map((destination) => ({
          sourceNodeId: source.parentSection.parentNode.id,
          sourceConnectorId: source.id,
          destinationNodeId:
            destination.destinationConnector.parentSection.parentNode.id,
          destinationConnectorId: destination.destinationConnector.id,
          css: destination.css,
        }));
      })
      .flat();
  }

  public getAllDestinationConnections() {
    return this.getAllDestinationConnectors()
      .map((destination) => {
        const filteredSources = destination.sources.filter(
          (source) =>
            source.sourceConnector.parentSection.parentNode.id === this.id,
        );
        return filteredSources.map((source) => ({
          sourceNodeId: source.sourceConnector.parentSection.parentNode.id,
          sourceConnectorId: source.sourceConnector.id,
          destinationNodeId: destination.parentSection.parentNode.id,
          destinationConnectorId: destination.id,
          css: source.sourceConnector.css,
        }));
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
}
