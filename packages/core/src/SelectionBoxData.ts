import { SelectableElementType } from "./nodeflow-types";
import SelectionMap from "./SelectionMap";
import Rect from "./Rect";

export default class SelectionBoxData {
  private _boundingBox: Rect | undefined = undefined;
  public readonly selections: SelectionMap;
  private readonly nodeflowData: any;

  public constructor(nodeflowData: any) {
    this.nodeflowData = nodeflowData;
    this.selections = new SelectionMap(this.nodeflowData);
  }

  public get boundingBox() {
    return this._boundingBox;
  }

  public set boundingBox(value: Rect | undefined) {
    this._boundingBox = value;

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

    const highlightedNodes =
      this.nodeflowData.chunking.getNodesInRect(transformedRect);

    this.selections.clear();
    highlightedNodes.forEach((node: any) => {
      this.selections.add({
        type: SelectableElementType.Node,
        node,
      });
    });
  }
}
