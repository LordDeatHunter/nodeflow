import { NodeflowData } from "./index";
import { createStore } from "solid-js/store";
import {
  SelectableElementType,
  SelectionBoxDataType,
} from "../../nodeflow-types";
import SelectionMap from "../SelectionMap";
import Rect from "./Rect";

export default class SelectionBoxData {
  private readonly store;
  private readonly nodeflowData: NodeflowData;

  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
    this.store = createStore<SelectionBoxDataType>({
      boundingBox: undefined,
      selections: new SelectionMap(this.nodeflowData),
    });
  }

  public get boundingBox() {
    return this.store[0].boundingBox;
  }

  public set boundingBox(value: Rect | undefined) {
    this.store[1]({ boundingBox: value });

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
    highlightedNodes.forEach((node) => {
      this.selections.add({
        type: SelectableElementType.Node,
        node,
      });
    });
  }

  public get selections() {
    return this.store[0].selections;
  }
}
