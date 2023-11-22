import { addConnection, setMouseData } from "./drawflow-storage";
import { EventPublisher } from "./EventPublisher";

export interface NodeConnectedEventData {
  outputNodeId: string;
  outputId: string;
  inputNodeId: string;
  inputId: string;
}

export interface DrawflowEventsDataMap {
  onNodeConnected: NodeConnectedEventData;
}

export type DrawflowEvent<T extends keyof DrawflowEventsDataMap> = (
  data: DrawflowEventsDataMap[T],
) => void;

export type DrawflowEventRecord = {
  [K in keyof DrawflowEventsDataMap]: EventPublisher<K>;
};

export const drawflowEventStore: DrawflowEventRecord = {
  onNodeConnected: new EventPublisher<"onNodeConnected">(),
};

drawflowEventStore.onNodeConnected.subscribe("create-connection", (data) =>
  addConnection(
    data.inputNodeId,
    data.inputId,
    data.outputNodeId,
    data.outputId,
  ),
);
drawflowEventStore.onNodeConnected.subscribe("reset-mouse-data", () => {
  setMouseData({
    draggingNode: false,
    heldNodeId: undefined,
    heldOutputId: undefined,
  });
});
