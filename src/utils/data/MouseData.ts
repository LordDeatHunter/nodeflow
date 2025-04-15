import Vec2 from "./Vec2";
import {
  MouseDataType,
  Optional,
  SelectableConnection,
  SelectableElementType,
  SerializedMouseData,
} from "../../nodeflow-types";
import { NodeflowData } from "./index";
import SelectionMap from "../SelectionMap";
import NodeflowNodeData from "./NodeflowNodeData";
import NodeConnector from "./NodeConnector";
import { MOUSE_BUTTONS } from "../constants";
import SelectionBoxData from "./SelectionBoxData";

/**
 * Represents additional mouse data used in the nodeflow canvas, such held objects and mouse position.
 */
export default class MouseData {
  private store: MouseDataType;
  private readonly nodeflowData: NodeflowData;

  /**
   * @param nodeflowData - The nodeflow object of the canvas that this mouse data will be used in
   */
  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
    this.store = {
      clickStartPosition: undefined,
      mousePosition: Vec2.zero(),
      heldMouseButtons: new Set<MOUSE_BUTTONS>(),
      pointerDown: false,
      selections: new SelectionMap(this.nodeflowData),
      selectionBox: new SelectionBoxData(this.nodeflowData),
    };
  }

  public serialize(): SerializedMouseData {
    return {
      clickStartPosition: this.clickStartPosition?.serialize(),
      selections: this.selections.toObject(),
    };
  }

  public deserialize(serialized: SerializedMouseData) {
    this.update({
      clickStartPosition: Vec2.deserializeOrDefault(
        serialized.clickStartPosition,
      ),
      selections: SelectionMap.fromObject(
        serialized.selections,
        this.nodeflowData,
      ),
    });
  }

  get clickStartPosition(): Optional<Vec2> {
    return this.store.clickStartPosition;
  }

  get heldMouseButtons(): Set<MOUSE_BUTTONS> {
    return this.store.heldMouseButtons;
  }

  get selections(): SelectionMap {
    return this.store.selections;
  }

  get selectionBox(): SelectionBoxData {
    return this.store.selectionBox;
  }

  get mousePosition(): Vec2 {
    return this.store.mousePosition;
  }

  get heldConnections(): Array<SelectableConnection> {
    return this.selections.selectedConnections;
  }

  get heldConnectors(): Array<NodeConnector> {
    return this.selections.selectedConnectors;
  }

  get heldNodes(): Array<NodeflowNodeData> {
    return this.selections.selectedNodes;
  }

  public isHoldingButton(button: MOUSE_BUTTONS) {
    return this.heldMouseButtons.has(button);
  }

  public deleteNodes(callback: (node: NodeflowNodeData) => boolean) {
    this.selections.deleteNodes(callback);
  }

  public deleteConnectors(callback: (connector: NodeConnector) => boolean) {
    this.selections.deleteConnectors(callback);
  }

  public deleteConnections(
    callback: (connection: SelectableConnection) => boolean,
  ) {
    this.selections.deleteConnections(callback);
  }

  set clickStartPosition(value: Optional<Vec2>) {
    this.store.clickStartPosition = value;
  }

  set mousePosition(value: Vec2) {
    this.store.mousePosition = value;
  }

  set pointerDown(value: boolean) {
    this.store.pointerDown = value;
  }

  public update(data: Partial<MouseDataType>) {
    this.store = { ...this.store, ...data };
  }

  public updateWithPrevious(
    updater: (data: MouseDataType) => Partial<MouseDataType>,
  ) {
    this.store = { ...this.store, ...updater(this.store) };
  }

  public reset() {
    this.update({
      clickStartPosition: undefined,
      pointerDown: false,
      heldMouseButtons: new Set<MOUSE_BUTTONS>(),
      selections: new SelectionMap(this.nodeflowData),
      selectionBox: new SelectionBoxData(this.nodeflowData),
    });
  }

  public selectNodeflow() {
    if (this.hasSelectedNodeflow()) {
      this.selections.clearNodeflow();
    }

    this.selections.addNodeflow();
  }

  public selectNode = (nodeId: string, position: Vec2, dragging = true) => {
    if (!this.nodeflowData.nodes.has(nodeId)) return;
    const node = this.nodeflowData.nodes.get(nodeId)!;

    if (this.hasSelectedNode(nodeId)) {
      this.selections.delete({ type: SelectableElementType.Node, node });
    }

    this.selections.addNode(node);

    this.update({
      pointerDown: dragging,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(this.nodeflowData.zoomLevel)
        .subtract(this.nodeflowData.nodes.get(nodeId)!.position),
    });
  };

  /**
   * Deselects the currently selected node, connector and connection.
   */
  public clearSelections = () => {
    this.selections.clear();
    this.nodeflowData.resetMovement();
  };

  public startCreatingConnection = (
    nodeId: string,
    position: Vec2,
    outputId: string,
  ) => {
    if (!this.nodeflowData.settings.canCreateConnections) return;

    const node = this.nodeflowData.nodes.get(nodeId);
    if (!node) return;

    const connector = node.getConnector(outputId);
    if (!connector) return;

    const selections = new SelectionMap(this.nodeflowData);
    selections.add({
      connector,
      type: SelectableElementType.Connector,
    });

    this.update({
      pointerDown: true,
      selections,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(this.nodeflowData.zoomLevel)
        .subtract(node.position),
    });
  };

  public hasSelectedNodeflow(): boolean {
    return this.selections.hasSelectedNodeflow();
  }

  public hasSelectedNode(nodeId: string) {
    return this.selections.isNodeSelected(nodeId);
  }

  public hasSelectedConnector(nodeId: string, connectorId: string) {
    return this.selections.isConnectorSelected(nodeId, connectorId);
  }

  public hasSelectedConnection(
    sourceNodeId: string,
    sourceConnectorId: string,
    destinationNodeId: string,
    destinationConnectorId: string,
  ) {
    return this.selections.isConnectionSelected(
      sourceNodeId,
      sourceConnectorId,
      destinationNodeId,
      destinationConnectorId,
    );
  }

  /**
   * Returns the global mouse position, relative to the canvas.
   */
  public globalMousePosition = () =>
    this.nodeflowData.transformVec2ToCanvas(this.mousePosition);
}
