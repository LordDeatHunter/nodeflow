import { DocumentEventPublisher, NodeflowData } from "./data";
import { DocumentEventRecord } from "../nodeflow-types";
import Vec2 from "./data/Vec2";
import NodeflowCanvas from "../components/NodeflowCanvas";

export default class NodeflowLib {
  private readonly nodeflows;
  private static instance: NodeflowLib;
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
    this.setupDefaultEventHandlers();
  }

  public static get() {
    if (!this.instance) {
      NodeflowLib.instance = new NodeflowLib();
    }
    return NodeflowLib.instance;
  }

  public createCanvas(
    id: string,
    ...params: ConstructorParameters<typeof NodeflowData>
  ): [NodeflowData, ReturnType<typeof NodeflowCanvas>] {
    const nodeflowData = new NodeflowData(...params);
    this.nodeflows.set(id, nodeflowData);

    return [nodeflowData, NodeflowCanvas(nodeflowData)];
  }

  public getNodeflow(id: string) {
    return this.nodeflows.get(id);
  }

  public removeNodeflow(id: string) {
    this.nodeflows.delete(id);
  }

  public clear() {
    this.nodeflows.clear();
  }

  public hasNodeflow(id: string) {
    return this.nodeflows.has(id);
  }

  private setupDefaultEventHandlers() {
    document.onmousemove = (event) =>
      this.globalEventStore.onMouseMoveInDocument.publish({ event });

    document.onpointerleave = (event) =>
      this.globalEventStore.onPointerLeaveFromDocument.publish({ event });

    document.onpointerup = (event) =>
      this.globalEventStore.onPointerUpInDocument.publish({ event });

    this.globalEventStore.onMouseMoveInDocument.subscribeMultiple([
      {
        name: "update-mouse-position",
        event: ({ event }) => {
          this.nodeflows.forEach((nodeflow) => {
            nodeflow.mouseData.mousePosition = Vec2.fromEvent(event);
          });
        },
      },
    ]);

    this.globalEventStore.onPointerLeaveFromDocument.subscribeMultiple([
      {
        name: "reset-mouse-data",
        event: () => {
          this.nodeflows.forEach((nodeflow) => {
            nodeflow.mouseData.reset();
          });
        },
      },
    ]);

    this.globalEventStore.onPointerUpInDocument.subscribeMultiple([
      // TODO: figure out why this is always called, even when elements lower in the DOM have cancelled the event
      // {
      //   name: "reset-mouse-data",
      //   event: () => {
      //     nodeflows.forEach((nodeflow) => {
      //       nodeflow.mouseData.reset();
      //     });
      //   },
      // },
    ]);
  }
}
