import { createStore } from "solid-js/store";
import { NodeConnector as NodeConnectorData } from "../../drawflow-types";

export default class NodeConnector {
  private readonly store;

  constructor(data: NodeConnectorData) {
    this.store = createStore<NodeConnectorData>(data);
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

  public update(data: Partial<NodeConnectorData>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: NodeConnectorData) => Partial<NodeConnectorData>,
  ) {
    this.store[1](updater);
  }
}
