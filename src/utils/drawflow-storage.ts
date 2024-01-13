import { produce } from "solid-js/store";
import {
  DeepPartial,
  DrawflowNode as DrawflowNodeData,
  Optional,
  SelectableElementCSS,
} from "../drawflow-types";
import { clamp } from "./math-utils";
import { intersectionOfSets, isSetEmpty } from "./misc-utils";
import { Vec2 } from "./vec2";
import { Changes } from "./Changes";
import { drawflowEventStore } from "./events";
import Drawflow from "./Drawflow";
import MouseData from "./MouseData";
import DrawflowNode from "./DrawflowNode";
import NodeConnector from "./NodeConnector";
import ConnectorSection from "./ConnectorSection";
import ConnectorDestination from "./ConnectorDestination";
import { ReactiveMap } from "@solid-primitives/map";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorSource from "./ConnectorSource";

export const changes = new Changes();
export const drawflow = new Drawflow();
export const mouseData = new MouseData();
export const nodes = new ReactiveMap<string, DrawflowNode>();
export const Constants = {
  KEYBOARD_ZOOM_AMOUNT: 15,
  MAX_SPEED: 15,
  MAX_ZOOM: 200,
  MIN_ZOOM: 0.02,
  MOVE_DISTANCE: 100,
  MOVE_SLOWDOWN: 0.85,
  MOVE_SPEED_INCREASE: 1.5,
  SQRT_2_OVER_2: 0.7071067811865476,
  ZOOM_MULTIPLIER: 0.005,
  CURVE_MULTIPLIER: 3,
} as const;

export const heldKeys = new Set<string>();

export const KEYS: Record<string, Set<string>> = {
  MOVE_DOWN: new Set(["ArrowDown", "KeyS"]),
  MOVE_LEFT: new Set(["ArrowLeft", "KeyA"]),
  MOVE_RIGHT: new Set(["ArrowRight", "KeyD"]),
  MOVE_UP: new Set(["ArrowUp", "KeyW"]),
};

const calculateMovement = (
  isMoving: boolean,
  initialSpeed: number,
  positiveMovement: boolean,
  negativeMovement: boolean,
  inverse = false,
) => {
  let speed = initialSpeed;
  if (isMoving) {
    const change = Constants.MOVE_SPEED_INCREASE * (inverse ? -1 : 1);
    speed = clamp(
      speed + (positiveMovement ? change : 0) - (negativeMovement ? change : 0),
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED,
    );
  } else {
    speed = clamp(
      speed * Constants.MOVE_SLOWDOWN,
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED,
    );
  }
  if (speed <= 0.1 && speed >= -0.1) speed = 0;
  return speed;
};

export const resetMovement = () => {
  drawflow.currentMoveSpeed = Vec2.zero();
  KEYS.MOVE_LEFT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_RIGHT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_UP.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_DOWN.forEach((key) => heldKeys.delete(key));
};

export const updateNodePosition = (moveSpeed: Vec2) => {
  const id = mouseData.heldNodeId;

  if (!id || !nodes.has(id)) return;

  const node = nodes.get(id)!;

  node.updateWithPrevious((prev) =>
    // TODO: check if this makes sense:
    // const newPosition = prev.position.add(
    //   moveSpeed.divideBy(drawflow.zoomLevel),
    // );

    ({
      position: prev.position.add(moveSpeed),
    }),
  );
};

setInterval(() => {
  const movingLeft = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_LEFT));
  const movingRight = !isSetEmpty(
    intersectionOfSets(heldKeys, KEYS.MOVE_RIGHT),
  );
  const movingUp = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_UP));
  const movingDown = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_DOWN));

  const isDraggingNode = mouseData.heldNodeId !== undefined;

  drawflow.currentMoveSpeed = Vec2.of(
    calculateMovement(
      movingLeft || movingRight,
      drawflow.currentMoveSpeed.x,
      movingRight,
      movingLeft,
      !isDraggingNode,
    ),
    calculateMovement(
      movingUp || movingDown,
      drawflow.currentMoveSpeed.y,
      movingDown,
      movingUp,
      !isDraggingNode,
    ),
  );
  if (!mouseData.heldNodeId) {
    drawflow.updateBackgroundPosition(drawflow.currentMoveSpeed, true);
  } else {
    updateNodePosition(drawflow.currentMoveSpeed);
  }
}, 10);

export const addNode = (
  data: Partial<DrawflowNodeData>,
  addToHistory = true,
): DrawflowNode => {
  const id = data.id ?? getNextFreeNodeId();
  const newNode: Optional<DrawflowNode> = new DrawflowNode({
    centered: data.centered ?? false,
    connectorSections:
      data.connectorSections ?? new ReactiveMap<string, ConnectorSection>(),
    css: data.css ?? {},
    customData: data.customData ?? ({} as SolidDrawflow.CustomDataType),
    display: data.display ?? (() => undefined),
    id,
    offset: Vec2.zero(),
    position: data.position ?? Vec2.zero(),
    ref: undefined,
    size: Vec2.zero(),
  });
  nodes.set(id, newNode);

  if (addToHistory) {
    const oldConnections = getAllSourceConnections(id);

    changes.addChange({
      type: "add",
      source: "node",
      applyChange: () => {
        addNode(newNode.asObject(), false);
        oldConnections.forEach((connection) => {
          addConnection(
            connection.sourceNodeId,
            connection.sourceConnectorId,
            connection.destinationNodeId,
            connection.destinationConnectorId,
            connection.css,
            false,
          );
        });
      },
      undoChange: () => {
        removeNode(id, false);
      },
    });
  }

  return newNode;
};

export const updateNode = (
  nodeId: string,
  data: DeepPartial<DrawflowNodeData>,
  addToHistory = true,
) => {
  if (!nodes.has(nodeId)) return;

  const node = nodes.get(nodeId)!;

  if (addToHistory) {
    const oldNode = nodes.get(nodeId)!;
    const oldConnections = getAllSourceConnections(nodeId);
    const applyChange = () => {
      updateNode(nodeId, data, false);
    };
    const undoChange = () => {
      updateNode(nodeId, oldNode.asObject(), false);
      oldConnections.forEach((connection) => {
        addConnection(
          connection.sourceNodeId,
          connection.sourceConnectorId,
          connection.destinationNodeId,
          connection.destinationConnectorId,
          connection.css,
          false,
        );
      });
    };
    changes.addChange({
      type: "update",
      source: "node",
      applyChange,
      undoChange,
    });
  }

  drawflowEventStore.onNodeDataChanged.publish({ nodeId, data });

  node.updateWithPrevious(produce((prev) => Object.assign(prev, data)));
};

export const getNextFreeNodeId = (): string => {
  let newId = "0";
  for (let i = 1; nodes.has(newId); ++i) {
    newId = i.toString();
  }
  return newId;
};

export const getNextFreeConnectorId = (nodeId: string): string => {
  let newId = "0";
  if (!nodes.has(nodeId)) return newId;

  const node = nodes.get(nodeId)!;
  for (
    let i = 1;
    Array.from(node.connectorSections.values()).some((section) =>
      section.connectors.has(newId),
    );
    ++i
  ) {
    newId = i.toString();
  }

  return newId;
};

export const getNextFreeConnectorSectionId = (nodeId: string): string => {
  let newId = "0";
  if (!nodes.has(nodeId)) {
    return newId;
  }

  const node = nodes.get(nodeId)!;
  for (let i = 1; node.connectorSections.has(newId); ++i) {
    newId = i.toString();
  }

  return newId;
};

/**
 * Removes a node and all connections to and from it
 * @param nodeId - the id of the node to remove
 * @param addToHistory - whether to add this change to the history
 */
export const removeNode = (nodeId: string, addToHistory = true) => {
  if (!nodes.has(nodeId)) return;

  mouseData.deselectNode();

  if (addToHistory) {
    const oldConnections = getAllSourceConnections(nodeId);
    const oldNode = nodes.get(nodeId)!;

    changes.addChange({
      type: "remove",
      source: "node",
      applyChange: () => {
        removeNode(nodeId, false);
      },
      undoChange: () => {
        addNode(oldNode, false);
        oldConnections.forEach((connection) => {
          addConnection(
            connection.sourceNodeId,
            connection.sourceConnectorId,
            connection.destinationNodeId,
            connection.destinationConnectorId,
            connection.css,
            false,
          );
        });
      },
    });
  }

  removeIncomingConnections(nodeId);
  removeOutgoingConnections(nodeId);

  nodes.delete(nodeId);
};

export const removeIncomingConnections = (nodeId: string) => {
  if (!nodes.has(nodeId)) {
    return;
  }

  nodes.get(nodeId)!.connectorSections.forEach((section) => {
    section.connectors.forEach((connector) => {
      connector.sources.forEach(({ sourceConnector }) => {
        sourceConnector.destinations.filterInPlace(
          ({ destinationConnector }) =>
            destinationConnector.parentSection.parentNode.id !== nodeId,
        );
      });
      connector.sources = new ArrayWrapper<ConnectorSource>([]);
    });
  });
};

export const removeOutgoingConnections = (nodeId: string) => {
  if (!nodes.has(nodeId)) {
    return;
  }

  nodes.get(nodeId)!.connectorSections.forEach((section) => {
    section.connectors.forEach((connector) => {
      connector.destinations.forEach(({ destinationConnector }) => {
        destinationConnector.sources.filterInPlace(
          ({ sourceConnector }) =>
            sourceConnector.parentSection.parentNode.id !== nodeId,
        );
      });
      connector.destinations = new ArrayWrapper<ConnectorDestination>([]);
    });
  });
};

export const getAllSourceConnectors = (nodeId: string): NodeConnector[] => {
  if (!nodes.has(nodeId)) {
    return [];
  }
  const node = nodes.get(nodeId)!;

  return Array.from(node.connectorSections.values()).reduce(
    (connectors, section) =>
      connectors.concat(
        Array.from(section.connectors.values()).flatMap((connector) =>
          connector.sources.flatMap((source) => source.sourceConnector),
        ),
      ),
    [] as NodeConnector[],
  );
};

export const getAllDestinationConnectors = (
  nodeId: string,
): NodeConnector[] => {
  if (!nodes.has(nodeId)) {
    return [];
  }
  const node = nodes.get(nodeId)!;

  return Array.from(node.connectorSections.values()).reduce(
    (connectors, section) =>
      connectors.concat(
        Array.from(section.connectors.values()).flatMap((connector) =>
          connector.destinations.flatMap(
            (destination) => destination.destinationConnector,
          ),
        ),
      ),
    [] as NodeConnector[],
  );
};

export const getAllSourceConnections = (nodeId: string) =>
  getAllSourceConnectors(nodeId)
    .map((source) => {
      const filteredDestinations = source.destinations.filter(
        (destination) =>
          destination.destinationConnector.parentSection.parentNode.id ===
          nodeId,
      );
      return filteredDestinations.map((destination) => ({
        sourceNodeId: source.parentSection.parentNode.id,
        sourceConnectorId: source.id,
        destinationNodeId:
          destination.destinationConnector.parentSection.parentNode.id,
        destinationConnectorId: destination.destinationConnector.id,
        css: destination.css,
      }));
    })
    .flat();

export const getAllDestinationConnections = (nodeId: string) =>
  getAllDestinationConnectors(nodeId)
    .map((destination) => {
      const filteredSources = destination.sources.filter(
        (source) =>
          source.sourceConnector.parentSection.parentNode.id === nodeId,
      );
      return filteredSources.map((source) => ({
        sourceNodeId: source.sourceConnector.parentSection.parentNode.id,
        sourceConnectorId: source.sourceConnector.id,
        destinationNodeId: destination.parentSection.parentNode.id,
        destinationConnectorId: destination.id,
        css: source.sourceConnector.css,
      }));
    })
    .flat();

export const addConnection = (
  sourceNodeId: string,
  sourceConnectorId: string,
  destinationNodeId: string,
  destinationConnectorId: string,
  css?: SelectableElementCSS,
  addToHistory = true,
) => {
  // Check if nodes exist
  if (!nodes.has(sourceNodeId) || !nodes.has(destinationNodeId)) {
    return;
  }

  const sourceSection = getSectionFromConnector(
    sourceNodeId,
    sourceConnectorId,
  );
  const destinationSection = getSectionFromConnector(
    destinationNodeId,
    destinationConnectorId,
  );

  // Check if sections exist
  if (!sourceSection || !destinationSection) {
    return;
  }

  // Check if connectors exist
  if (
    !sourceSection.connectors.has(sourceConnectorId) ||
    !destinationSection.connectors.has(destinationConnectorId)
  ) {
    return;
  }
  const sourceConnector = sourceSection.connectors.get(sourceConnectorId)!;
  const destinationConnector = destinationSection.connectors.get(
    destinationConnectorId,
  )!;

  // Check if connection already exists
  if (
    sourceConnector.destinations.some(
      (destination) =>
        destination.destinationConnector === destinationConnector,
    )
  ) {
    return;
  }

  if (addToHistory) {
    changes.addChange({
      type: "add",
      source: "connection",
      applyChange: () =>
        addConnection(
          sourceNodeId,
          sourceConnectorId,
          destinationNodeId,
          destinationConnectorId,
          css,
          false,
        ),
      undoChange: () =>
        removeConnection(
          sourceNodeId,
          sourceConnectorId,
          destinationNodeId,
          destinationConnectorId,
          false,
        ),
    });
  }

  sourceConnector.destinations.push(
    new ConnectorDestination({
      destinationConnector,
      css: css ?? {},
    }),
  );

  destinationConnector.sources.push(
    new ConnectorSource({
      sourceConnector,
    }),
  );
};

export const removeConnection = (
  sourceNodeId: string,
  sourceConnectorId: string,
  destinationNodeId: string,
  destinationConnectorId: string,
  addToHistory = true,
) => {
  // Check if nodes exist
  if (!nodes.has(sourceNodeId) || !nodes.has(destinationNodeId)) {
    return;
  }

  const sourceSection = getSectionFromConnector(
    sourceNodeId,
    sourceConnectorId,
  );
  const destinationSection = getSectionFromConnector(
    destinationNodeId,
    destinationConnectorId,
  );

  // Check if sections exist
  if (!sourceSection || !destinationSection) {
    return;
  }

  // Check if connectors exist
  if (
    !sourceSection.connectors.has(sourceConnectorId) ||
    !destinationSection.connectors.has(destinationConnectorId)
  ) {
    return;
  }
  const sourceConnector = sourceSection.connectors.get(sourceConnectorId)!;
  const destinationConnector = destinationSection.connectors.get(
    destinationConnectorId,
  )!;

  if (addToHistory) {
    const css = sourceConnector.destinations.find(
      (destination) =>
        destination.destinationConnector.parentSection.parentNode.id ===
        destinationNodeId,
    )?.css;
    const undoChange = () => {
      addConnection(
        sourceNodeId,
        sourceConnectorId,
        destinationNodeId,
        destinationConnectorId,
        css,
      );
    };
    const applyChange = () => {
      removeConnection(
        sourceNodeId,
        sourceConnectorId,
        destinationNodeId,
        destinationConnectorId,
        false,
      );
    };
    changes.addChange({
      type: "remove",
      source: "connection",
      applyChange,
      undoChange,
    });
  }

  sourceConnector.destinations.filterInPlace(
    (destination) =>
      destination.destinationConnector.parentSection.parentNode.id !==
      destinationNodeId,
  );

  destinationConnector.sources.filterInPlace(
    (source) =>
      source.sourceConnector.parentSection.parentNode.id !== sourceNodeId,
  );
};

export const addConnector = (
  nodeId: string,
  sectionId: string,
  connectorId: Optional<string>,
  data: Partial<NodeConnector>,
  addToHistory = true,
) => {
  if (!nodes.has(nodeId)) {
    return;
  }
  const node = nodes.get(nodeId)!;

  if (!node.connectorSections.has(sectionId)) {
    return;
  }
  const section = node.connectorSections.get(sectionId)!;

  if (!connectorId || section.connectors.has(connectorId)) {
    connectorId = getNextFreeConnectorId(node.id);
  }

  if (getConnector(nodeId, connectorId)) {
    return;
  }

  if (addToHistory) {
    changes.addChange({
      type: "add",
      source: "connector",
      applyChange: () => {
        addConnector(nodeId, sectionId, connectorId, data, false);
      },
      undoChange: () => {
        removeConnector(nodeId, sectionId, connectorId!, false);
      },
    });
  }

  section.connectors.set(
    connectorId,
    new NodeConnector({
      resizeObserver: undefined,
      css: data?.css,
      destinations:
        data?.destinations ?? new ArrayWrapper<ConnectorDestination>([]),
      hovered: data?.hovered ?? false,
      id: connectorId,
      parentSection: section,
      position: data?.position ?? Vec2.zero(),
      ref: undefined,
      size: Vec2.zero(),
      sources: data?.sources ?? new ArrayWrapper<ConnectorSource>([]),
    }),
  );
};

export const removeConnector = (
  nodeId: string,
  sectionId: string,
  connectorId: string,
  addToHistory = true,
) => {
  if (!nodes.has(nodeId)) {
    return;
  }
  const node = nodes.get(nodeId)!;

  if (!node.connectorSections.has(sectionId)) {
    return;
  }
  const section = node.connectorSections.get(sectionId)!;

  if (!section.connectors.has(connectorId)) {
    return;
  }
  const connector = section.connectors.get(connectorId)!;

  if (addToHistory) {
    changes.addChange({
      type: "remove",
      source: "connector",
      applyChange: () => {
        removeConnector(nodeId, sectionId, connectorId, false);
      },
      undoChange: () => {
        addConnector(nodeId, sectionId, connectorId, connector, false);
      },
    });
  }

  section.connectors.delete(connectorId);
};

export const getConnectorCount = (nodeId: string) => {
  if (!nodes.has(nodeId)) {
    return 0;
  }
  const node = nodes.get(nodeId)!;

  return Array.from(node.connectorSections.values()).reduce(
    (total, section) => total + section.connectors.size,
    0,
  );
};

export const getConnector = (
  nodeId: string,
  connectorId: string,
): Optional<NodeConnector> => {
  if (!nodes.has(nodeId)) {
    return undefined;
  }

  return getSectionFromConnector(nodeId, connectorId)?.connectors.get(
    connectorId,
  );
};

export const getSectionFromConnector = (
  nodeId: string,
  connectorId: string,
): Optional<ConnectorSection> => {
  if (!nodes.has(nodeId)) {
    return undefined;
  }
  const node = nodes.get(nodeId)!;

  return Array.from(node.connectorSections.values()).find((section) =>
    section.connectors.get(connectorId),
  );
};

export const addConnectorSection = (
  nodeId: string,
  sectionId?: string,
  css?: string,
  addToHistory = true,
) => {
  if (!nodes.has(nodeId)) {
    return;
  }
  const node = nodes.get(nodeId)!;

  if (!sectionId || node.connectorSections.has(sectionId)) {
    sectionId = getNextFreeConnectorSectionId(node.id);
  }

  if (addToHistory) {
    changes.addChange({
      type: "remove",
      source: "connector-section",
      applyChange: () => {
        addConnectorSection(nodeId, sectionId, css, false);
      },
      undoChange: () => {
        removeConnectorSection(nodeId, sectionId!, false);
      },
    });
  }

  node.connectorSections.set(
    sectionId,
    new ConnectorSection({
      connectors: new ReactiveMap<string, NodeConnector>(),
      css,
      id: sectionId,
      parentNode: node,
    }),
  );
};

export const removeConnectorSection = (
  nodeId: string,
  sectionId: string,
  addToHistory = true,
) => {
  if (!nodes.has(nodeId)) {
    return;
  }
  const node = nodes.get(nodeId)!;

  if (!node.connectorSections.has(sectionId)) {
    return;
  }
  const section = node.connectorSections.get(sectionId)!;

  if (addToHistory) {
    changes.addChange({
      type: "remove",
      source: "connector-section",
      applyChange: () => {
        removeConnectorSection(nodeId, sectionId, false);
      },
      undoChange: () => {
        addConnectorSection(nodeId, sectionId, section.css, false);
      },
    });
  }

  node.connectorSections.delete(sectionId);
};

/**
 * @param nodeId - the id of the node containing the connector
 * @param connectorId - the id of the connector
 * @returns the total number of connections coming into the specified connector
 */
export const getTotalConnectedInputs = (
  nodeId: string,
  connectorId: string,
): number => getConnector(nodeId, connectorId)?.sources.length ?? 0;

export const getAllConnectors = (nodeId: string): NodeConnector[] => {
  if (!nodes.has(nodeId)) {
    return [];
  }
  const node = nodes.get(nodeId)!;

  return Array.from(node.connectorSections.values()).reduce(
    (connectors, section) =>
      connectors.concat(Array.from(section.connectors.values())),
    [] as NodeConnector[],
  );
};
