import { DocumentEventPublisher, DocumentEventRecord } from "./EventPublishers";
import Vec2 from "./Vec2";
import NodeflowData from "./NodeflowData";

export default class NodeflowRegistry {
  private readonly nodeflows: Map<string, NodeflowData>;
  private static instance: NodeflowRegistry;
  public readonly globalEventStore: DocumentEventRecord;

  private constructor() {
    this.nodeflows = new Map<string, NodeflowData>();
    this.globalEventStore = {
      onMouseMoveInDocument:
        new DocumentEventPublisher<"onMouseMoveInDocument">(),
      onPointerLeaveFromDocument:
        new DocumentEventPublisher<"onPointerLeaveFromDocument">(),
      onPointerUpInDocument:
        new DocumentEventPublisher<"onPointerUpInDocument">(),
    };
    this.setupSubscriptionRouting();
  }

  public static get(): NodeflowRegistry {
    if (!this.instance) {
      NodeflowRegistry.instance = new NodeflowRegistry();
    }
    return NodeflowRegistry.instance;
  }

  public createCanvas(
    ...params: ConstructorParameters<typeof NodeflowData>
  ): NodeflowData {
    const nodeflowData = new NodeflowData(...params);
    this.nodeflows.set(params[0], nodeflowData);
    return nodeflowData;
  }

  public getNodeflow(id: string): NodeflowData | undefined {
    return this.nodeflows.get(id);
  }

  public removeNodeflow(id: string): void {
    this.nodeflows.delete(id);
  }

  public clear(): void {
    this.nodeflows.clear();
  }

  public hasNodeflow(id: string): boolean {
    return this.nodeflows.has(id);
  }

  private setupSubscriptionRouting(): void {
    this.globalEventStore.onMouseMoveInDocument.subscribeMultiple([
      {
        name: "update-mouse-position",
        event: ({ event }) => {
          // Touch gestures track their own position in the touch handlers,
          // which measure each move from the last one they saw.
          if ((event as Partial<PointerEvent>).pointerType === "touch") return;
          this.nodeflows.forEach((nodeflow) => {
            nodeflow.mouseData.mousePosition = Vec2.fromEvent(event);
            nodeflow.updateDragEdgeScroll();
          });
        },
      },
    ]);

    this.globalEventStore.onPointerLeaveFromDocument.subscribeMultiple([
      {
        name: "reset-mouse-data",
        event: ({ event }) => {
          // A lifted finger "leaves" the document too, before its touchend
          // could drop a held connection.
          if (event.pointerType === "touch") return;
          this.nodeflows.forEach((nodeflow) => {
            nodeflow.mouseData.reset();
          });
        },
      },
    ]);

    this.globalEventStore.onPointerUpInDocument.subscribeMultiple([]);
  }
}
