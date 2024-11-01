import { createStore } from "solid-js/store";
import {
  NodeConnectorType,
  SerializedConnection,
  SerializedNodeConnector,
} from "../../nodeflow-types";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorSource from "./ConnectorSource";
import ConnectorDestination from "./ConnectorDestination";
import Vec2 from "./Vec2";
import ConnectorSection from "./ConnectorSection";
import { deepCopy } from "../misc-utils";

/**
 * Represents a connector on a node, that can be connected to other connectors.
 */
export default class NodeConnector {
  private readonly store;

  constructor(data: NodeConnectorType) {
    this.store = createStore<NodeConnectorType>(data);
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
      destinations: new ArrayWrapper<ConnectorDestination>(),
      hovered: data.hovered ?? false,
      id: connectorId,
      parentSection,
      position: Vec2.deserializeOrDefault(data.position),
      ref: undefined,
      resizeObserver: undefined,
      size: Vec2.zero(),
      sources: new ArrayWrapper<ConnectorSource>(),
    });
  }

  public get css() {
    return this.store[0].css;
  }

  public values() {
    return this.store[0];
  }

  public get destinations() {
    return this.store[0].destinations;
  }

  public get hovered() {
    return this.store[0].hovered;
  }

  public get id() {
    return this.store[0].id;
  }

  public get parentSection() {
    return this.store[0].parentSection;
  }

  public get parentNode() {
    return this.store[0].parentSection.parentNode;
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

  public get sources() {
    return this.store[0].sources;
  }

  public get customData() {
    return this.store[0].customData;
  }

  public set css(value) {
    this.store[1]({ css: value });
  }

  public set destinations(value) {
    this.store[1]({ destinations: value });
  }

  public set hovered(value) {
    this.store[1]({ hovered: value });
  }

  public set id(value) {
    this.store[1]({ id: value });
  }

  public set parentSection(value) {
    this.store[1]({ parentSection: value });
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

  public set sources(value) {
    this.store[1]({ sources: value });
  }

  public set customData(value) {
    this.store[1]({ customData: value });
  }

  public update(data: Partial<NodeConnectorType>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: NodeConnectorType) => Partial<NodeConnectorType>,
  ) {
    this.store[1](updater);
  }

  /**
   * Removes all connections going into the current connector.
   */
  public removeIncomingConnections() {
    this.sources.forEach(({ sourceConnector }) => {
      sourceConnector.destinations.filterInPlace(
        ({ destinationConnector }) =>
          destinationConnector.parentNode.id !== this.id,
      );
    });
    this.sources = new ArrayWrapper<ConnectorSource>();
  }

  /**
   * Removes all connections going out of the current connector.
   */
  public removeOutgoingConnections() {
    this.destinations.forEach(({ destinationConnector }) => {
      destinationConnector.sources.filterInPlace(
        ({ sourceConnector }) => sourceConnector.parentNode.id !== this.id,
      );
    });
    this.destinations = new ArrayWrapper<ConnectorDestination>();
  }

  public getCenter(): Vec2 {
    const { position: nodePosition, offset: nodeOffset } = this.parentNode;

    return nodePosition.add(nodeOffset, this.position, this.size.divideBy(2));
  }
}
