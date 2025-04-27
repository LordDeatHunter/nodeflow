import {
  NodeConnectorType,
  SerializedConnection,
  SerializedNodeConnector,
} from "../../nodeflow-types";
import ConnectorSource from "./ConnectorSource";
import ConnectorDestination from "./ConnectorDestination";
import Vec2 from "./Vec2";
import ConnectorSection from "./ConnectorSection";
import { deepCopy } from "../misc-utils";

/**
 * Represents a connector on a node, that can be connected to other connectors.
 */
export default class NodeConnector {
  private store: NodeConnectorType;

  constructor(data: NodeConnectorType) {
    this.store = data;
  }

  public serialize(): SerializedNodeConnector {
    return {
      css: this.css,
      customData: this.customData?.serialize(),
      hovered: this.hovered,
      id: this.id,
      position: this.position.serialize(),
    };
  }

  public serializeConnections(): Array<SerializedConnection> {
    return [
      ...this.destinations.map(({ destinationConnector, css }) => ({
        sourceNodeId: this.parentNode.id,
        sourceConnectorId: this.id,
        destinationNodeId: destinationConnector.parentNode.id,
        destinationConnectorId: destinationConnector.id,
        css: deepCopy(css),
      })),
      ...this.sources.map(({ sourceConnector }) => ({
        sourceNodeId: sourceConnector.parentNode.id,
        sourceConnectorId: sourceConnector.id,
        destinationNodeId: this.parentNode.id,
        destinationConnectorId: this.id,
        css: deepCopy(
          sourceConnector.destinations.find(
            (destination) =>
              destination.destinationConnector.parentNode.id ===
              this.parentNode.id,
          )?.css,
        ),
      })),
    ];
  }

  public static deserialize(
    data: Partial<SerializedNodeConnector>,
    parentSection: ConnectorSection,
  ) {
    const connectorId =
      !data.id || parentSection.connectors.has(data.id)
        ? parentSection.parentNode.getNextFreeConnectorId()
        : data.id;

    return new NodeConnector({
      css: data.css,
      customData:
        parentSection.parentNode.nodeflow.settings.createConnectorData(data),
      destinations: new Array<ConnectorDestination>(),
      hovered: data.hovered ?? false,
      id: connectorId,
      parentSection,
      ref: undefined,
      position: Vec2.deserializeOrDefault(data.position),
      resizeObserver: undefined,
      size: Vec2.zero(),
      sources: new Array<ConnectorSource>(),
    });
  }

  public get css() {
    return this.store.css;
  }

  public get destinations() {
    return this.store.destinations;
  }

  public get hovered() {
    return this.store.hovered;
  }

  public get id() {
    return this.store.id;
  }

  public get parentSection() {
    return this.store.parentSection;
  }

  public get parentNode() {
    return this.store.parentSection.parentNode;
  }

  public get position() {
    return this.store.position;
  }

  public get ref() {
    return this.store.ref;
  }

  public get resizeObserver() {
    return this.store.resizeObserver;
  }

  public get size() {
    return this.store.size;
  }

  public get sources() {
    return this.store.sources;
  }

  public get customData() {
    return this.store.customData;
  }

  public set css(value) {
    this.store.css = value;
  }

  public set destinations(value) {
    this.store.destinations = value;
  }

  public set hovered(value) {
    this.store.hovered = value;
  }

  public set id(value) {
    this.store.id = value;
  }

  public set parentSection(value) {
    this.store.parentSection = value;
  }

  public set position(value) {
    this.store.position = value;
  }

  public set resizeObserver(value) {
    this.store.resizeObserver = value;
  }

  public set size(value) {
    this.store.size = value;
  }

  public set sources(value) {
    this.store.sources = value;
  }

  public set customData(value) {
    this.store.customData = value;

    this.parentNode.nodeflow.eventStore.onConnectorCustomDataChanged.publish({
      nodeId: this.parentNode.id,
      connectorId: this.id,
      customData: value,
    });
  }

  public set ref(value) {
    this.store.ref = value;
  }

  public update(data: Partial<NodeConnectorType>) {
    this.store = {
      ...this.store,
      ...data,
    };
  }

  public updateWithPrevious(
    updater: (data: NodeConnectorType) => Partial<NodeConnectorType>,
  ) {
    this.store = {
      ...this.store,
      ...updater(this.store),
    };
  }

  /**
   * Removes all connections going into the current connector.
   */
  public removeIncomingConnections() {
    this.sources.forEach(({ sourceConnector }) => {
      sourceConnector.destinations = sourceConnector.destinations.filter(
        ({ destinationConnector }) =>
          destinationConnector.parentNode.id !== this.id,
      );
    });
    this.sources = new Array<ConnectorSource>();
  }

  /**
   * Removes all connections going out of the current connector.
   */
  public removeOutgoingConnections() {
    this.destinations.forEach(({ destinationConnector }) => {
      destinationConnector.sources = destinationConnector.sources.filter(
        ({ sourceConnector }) => sourceConnector.parentNode.id !== this.id,
      );
    });
    this.destinations = new Array<ConnectorDestination>();
  }

  public getCenter(): Vec2 {
    const { position: nodePosition, offset: nodeOffset } = this.parentNode;

    return nodePosition.add(nodeOffset, this.position, this.size.divideBy(2));
  }
}
