import type NodeflowData from "./NodeflowData";
import { SelectableElementType } from "./nodeflow-types";
import SelectionMap from "./SelectionMap";
import Rect from "./Rect";
import type NodeflowNodeData from "./NodeflowNodeData";

export default class SelectionBoxData {
  private _boundingBox: Rect | undefined = undefined;
  public readonly selections: SelectionMap;
  private readonly nodeflowData: NodeflowData;

  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
    this.selections = new SelectionMap(this.nodeflowData);
  }

  public get boundingBox() {
    return this._boundingBox;
  }

  public set boundingBox(value: Rect | undefined) {
    this._boundingBox = value;
    this.nodeflowData.publishContentChanged();

    if (!value) {
      this.selections.selectedNodes.forEach((node) => {
        this.nodeflowData.mouseData.selections.add({
          type: SelectableElementType.Node,
          node,
        });
      });

      this.selections.clear();

      return;
    }

    const rect = Rect.of(value.position, value.size);

    const transformedRect = Rect.fromPositions(
      this.nodeflowData.transformVec2ToCanvas(rect.startPosition()),
      this.nodeflowData.transformVec2ToCanvas(rect.endPosition()),
    );

    // Nodes hidden in collapsed groups cannot be box-selected.
    const highlightedNodes = this.nodeflowData.chunking
      .getNodesInRect(transformedRect)
      .filter(
        (node: NodeflowNodeData) => !this.nodeflowData.isNodeHidden(node.id),
      );

    this.selections.clear();
    highlightedNodes.forEach((node: NodeflowNodeData) => {
      this.selections.add({
        type: SelectableElementType.Node,
        node,
      });
    });
  }
}
