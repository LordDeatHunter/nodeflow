import Vec2 from "./Vec2";
import { SerializedMouseData, SelectableElementType } from "./nodeflow-types";
import { SelectableConnection } from "./types";
import SelectionMap from "./SelectionMap";
import SelectionBoxData from "./SelectionBoxData";
import { MOUSE_BUTTONS } from "./constants";

/**
 * Represents additional mouse data used in the nodeflow canvas, such held objects and mouse position.
 */
export default class MouseData {
  public clickStartPosition: Vec2 | undefined = undefined;
  public mousePosition: Vec2 = Vec2.zero();
  public heldMouseButtons: Set<MOUSE_BUTTONS> = new Set<MOUSE_BUTTONS>();
  public pointerDown: boolean = false;
  public selections: SelectionMap;
  public selectionBox: SelectionBoxData;
  private readonly nodeflowData: any;

  /**
   * @param nodeflowData - The nodeflow object of the canvas that this mouse data will be used in
   */
  public constructor(nodeflowData: any) {
    this.nodeflowData = nodeflowData;
    this.selections = new SelectionMap(this.nodeflowData);
    this.selectionBox = new SelectionBoxData(this.nodeflowData);
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

  public get heldConnections(): Array<SelectableConnection> {
    return this.selections.selectedConnections;
  }

  public get heldConnectors(): Array<any> {
    return this.selections.selectedConnectors;
  }

  public get heldNodes(): Array<any> {
    return this.selections.selectedNodes;
  }

  public isHoldingButton(button: MOUSE_BUTTONS) {
    return this.heldMouseButtons.has(button);
  }

  public deleteNodes(callback: (node: any) => boolean) {
    this.selections.deleteNodes(callback);
  }

  public deleteConnectors(callback: (connector: any) => boolean) {
    this.selections.deleteConnectors(callback);
  }

  public deleteConnections(
    callback: (connection: SelectableConnection) => boolean,
  ) {
    this.selections.deleteConnections(callback);
  }

  public update(
    data: Partial<{
      clickStartPosition: Vec2 | undefined;
      mousePosition: Vec2;
      heldMouseButtons: Set<MOUSE_BUTTONS>;
      pointerDown: boolean;
      selections: SelectionMap;
      selectionBox: SelectionBoxData;
    }>,
  ) {
    Object.assign(this, data);
  }

  public updateWithPrevious(
    updater: (data: {
      clickStartPosition: Vec2 | undefined;
      mousePosition: Vec2;
      heldMouseButtons: Set<MOUSE_BUTTONS>;
      pointerDown: boolean;
      selections: SelectionMap;
      selectionBox: SelectionBoxData;
    }) => Partial<{
      clickStartPosition: Vec2 | undefined;
      mousePosition: Vec2;
      heldMouseButtons: Set<MOUSE_BUTTONS>;
      pointerDown: boolean;
      selections: SelectionMap;
      selectionBox: SelectionBoxData;
    }>,
  ) {
    const result = updater({
      clickStartPosition: this.clickStartPosition,
      mousePosition: this.mousePosition,
      heldMouseButtons: this.heldMouseButtons,
      pointerDown: this.pointerDown,
      selections: this.selections,
      selectionBox: this.selectionBox,
    });
    Object.assign(this, result);
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

  public globalMousePosition = () =>
    this.nodeflowData.transformVec2ToCanvas(this.mousePosition);
}
