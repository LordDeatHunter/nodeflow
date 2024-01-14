import { DrawflowNode as DrawflowNodeData } from "../drawflow-types";
import { createStore } from "solid-js/store";
import { Vec2 } from "./vec2";
import { drawflow } from "./drawflow-storage";

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
    return this.store[0];
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
}
