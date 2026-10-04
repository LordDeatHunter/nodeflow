import { NodeConnectorType, ConnectorSectionType } from "./types";
import {
  SerializedConnection,
  SerializedNodeConnector,
} from "./nodeflow-types";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorSource from "./ConnectorSource";
import ConnectorDestination from "./ConnectorDestination";
import Vec2 from "./Vec2";
import { deepCopy } from "./misc-utils";

/**
 * Represents a connector on a node, that can be connected to other connectors.
 */
export default class NodeConnector {
  private _css?: string;
  private _destinations: ArrayWrapper<ConnectorDestination>;
  private _hovered: boolean;
  private _id: string;
  private _parentSection: ConnectorSectionType;
  private _position: Vec2;
  private _size: Vec2;
  private _sources: ArrayWrapper<ConnectorSource>;

  constructor(data: NodeConnectorType) {
    this._id = data.id;
    this._css = data.css;
    this._hovered = data.hovered ?? false;
    this._position = data.position ?? Vec2.zero();
    this._size = data.size ?? Vec2.zero();
    this._parentSection = data.parentSection;
    this._destinations =
      data.destinations ?? new ArrayWrapper<ConnectorDestination>();
    this._sources = data.sources ?? new ArrayWrapper<ConnectorSource>();
  }

  public serialize(): SerializedNodeConnector {
    return {
      css: this.css,
      hovered: this.hovered,
      id: this.id,
      position: this.position.serialize(),
    };
  }

  public serializeConnections(): Array<SerializedConnection> {
    return [
      ...this.destinations.map(({ destinationConnector, css, shape, dash }) => ({
        sourceNodeId: this.parentNode.id,
        sourceConnectorId: this.id,
        destinationNodeId: destinationConnector.parentNode.id,
        destinationConnectorId: destinationConnector.id,
        css: deepCopy(css),
        shape,
        dash,
      })),
      ...this.sources.map(({ sourceConnector }) => {
        const destination = sourceConnector.destinations.find(
          (destination: ConnectorDestination) =>
            destination.destinationConnector.parentNode.id ===
            this.parentNode.id,
        );
        return {
          sourceNodeId: sourceConnector.parentNode.id,
          sourceConnectorId: sourceConnector.id,
          destinationNodeId: this.parentNode.id,
          destinationConnectorId: this.id,
          css: deepCopy(destination?.css),
          shape: destination?.shape,
          dash: destination?.dash,
        };
      }),
    ];
  }

  public static deserialize(
    data: Partial<SerializedNodeConnector>,
    parentSection: ConnectorSectionType,
  ) {
    const connectorId =
      !data.id || parentSection.connectors.has(data.id)
        ? parentSection.parentNode.getNextFreeConnectorId()
        : data.id;

    return new NodeConnector({
      css: data.css,
      destinations: new ArrayWrapper<ConnectorDestination>(),
      hovered: data.hovered ?? false,
      id: connectorId,
      parentSection,
      position: Vec2.deserializeOrDefault(data.position),
      size: Vec2.zero(),
      sources: new ArrayWrapper<ConnectorSource>(),
    });
  }

  public get css() {
    return this._css;
  }

  public values(): NodeConnectorType {
    return {
      css: this._css,
      destinations: this._destinations,
      hovered: this._hovered,
      id: this._id,
      parentSection: this._parentSection,
      position: this._position,
      size: this._size,
      sources: this._sources,
    };
  }

  public get destinations() {
    return this._destinations;
  }

  public get hovered() {
    return this._hovered;
  }

  public get id() {
    return this._id;
  }

  public get parentSection() {
    return this._parentSection;
  }

  public get parentNode() {
    return this._parentSection.parentNode;
  }

  public get position() {
    return this._position;
  }

  public get size() {
    return this._size;
  }

  public get sources() {
    return this._sources;
  }

  public set css(value) {
    this._css = value;
  }

  public set destinations(value) {
    this._destinations = value;
  }

  public set hovered(value) {
    this._hovered = value;
  }

  public set id(value) {
    this._id = value;
  }

  public set parentSection(value) {
    this._parentSection = value;
  }

  public set position(value) {
    this._position = value;
  }

  public set size(value) {
    this._size = value;
  }

  public updateMeasurements(position: Vec2, size: Vec2): void {
    this._position = position;
    this._size = size;
  }

  public set sources(value) {
    this._sources = value;
  }

  public update(data: Partial<NodeConnectorType>) {
    if (data.css !== undefined) this._css = data.css;
    if (data.destinations !== undefined) this._destinations = data.destinations;
    if (data.hovered !== undefined) this._hovered = data.hovered;
    if (data.id !== undefined) this._id = data.id;
    if (data.parentSection !== undefined)
      this._parentSection = data.parentSection;
    if (data.position !== undefined) this._position = data.position;
    if (data.size !== undefined) this._size = data.size;
    if (data.sources !== undefined) this._sources = data.sources;
  }

  public updateWithPrevious(
    updater: (data: NodeConnectorType) => Partial<NodeConnectorType>,
  ) {
    const result = updater(this.values());
    this.update(result);
  }

  /**
   * Removes all connections going into the current connector.
   */
  public removeIncomingConnections() {
    this.sources.forEach(({ sourceConnector }) => {
      sourceConnector.destinations.filterInPlace(
        ({ destinationConnector }: ConnectorDestination) =>
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
        ({ sourceConnector }: ConnectorSource) =>
          sourceConnector.parentNode.id !== this.id,
      );
    });
    this.destinations = new ArrayWrapper<ConnectorDestination>();
  }

  public getCenter(): Vec2 {
    const { position: nodePosition, offset: nodeOffset } = this.parentNode;

    return nodePosition.add(nodeOffset, this.position, this.size.divideBy(2));
  }
}
