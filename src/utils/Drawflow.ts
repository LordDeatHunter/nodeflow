import setup from "./setup";
import { Vec2 } from "./vec2";
import { createStore } from "solid-js/store";
import { DrawflowData } from "../drawflow-types";
import { windowSize } from "./screen-utils";
import { clamp } from "./math-utils";
import { Constants, drawflow, mouseData } from "./drawflow-storage";

export default class Drawflow {
  private readonly store;

  constructor() {
    this.store = createStore<DrawflowData>({
      currentMoveSpeed: Vec2.zero(),
      position: Vec2.zero(),
      startPosition: Vec2.zero(),
      size: Vec2.zero(),
      zoomLevel: 1,
      pinchDistance: 0,
    });

    setup();
  }

  get currentMoveSpeed() {
    return this.store[0].currentMoveSpeed;
  }

  get position() {
    return this.store[0].position;
  }

  get startPosition() {
    return this.store[0].startPosition;
  }

  get size() {
    return this.store[0].size;
  }

  get zoomLevel() {
    return this.store[0].zoomLevel;
  }

  get pinchDistance() {
    return this.store[0].pinchDistance;
  }

  set currentMoveSpeed(value) {
    this.store[1]({ currentMoveSpeed: value });
  }

  set position(value) {
    this.store[1]({ position: value });
  }

  set startPosition(value) {
    this.store[1]({ startPosition: value });
  }

  set size(value) {
    this.store[1]({ size: value });
  }

  set zoomLevel(value) {
    this.store[1]({ zoomLevel: value });
  }

  set pinchDistance(value) {
    this.store[1]({ pinchDistance: value });
  }

  public update(data: Partial<DrawflowData>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: DrawflowData) => Partial<DrawflowData>,
  ) {
    this.store[1](updater);
  }

  public center = () => {
    const windowDimensions = windowSize();
    const windowCenter = windowDimensions.divideBy(2);

    return this.position.negate().add(windowCenter);
  };

  public updateZoom = (distance: number, location: Vec2) => {
    const oldZoom = this.zoomLevel;

    if (distance === 0) return;

    const newZoom = Number(
      clamp(
        distance > 0
          ? oldZoom + oldZoom * distance * Constants.ZOOM_MULTIPLIER
          : oldZoom / (1 - distance * Constants.ZOOM_MULTIPLIER),
        Constants.MIN_ZOOM,
        Constants.MAX_ZOOM,
      ).toFixed(4),
    );

    mouseData.isDraggingNode = false;

    const windowDimensions = this.size;
    const centeredZoomLocation = location.subtract(this.startPosition);

    const oldScreenSize = windowDimensions.multiplyBy(oldZoom);
    const newScreenSize = windowDimensions.multiplyBy(newZoom);
    const oldOffset = centeredZoomLocation
      .subtract(oldScreenSize.divideBy(2))
      .divideBy(oldZoom);

    const newOffset = centeredZoomLocation
      .subtract(newScreenSize.divideBy(2))
      .divideBy(newZoom);

    this.updateWithPrevious((prev) => ({
      position: prev.position.subtract(oldOffset).add(newOffset),
      zoomLevel: newZoom,
    }));
  };

  public updateBackgroundPosition(moveDistance: Vec2, keyboard = false) {
    if (mouseData.heldNodeId || keyboard === mouseData.isDraggingNode) return;
    drawflow.updateWithPrevious((prev) => ({
      position: prev.position.add(moveDistance.divideBy(drawflow.zoomLevel)),
    }));
  }
}
