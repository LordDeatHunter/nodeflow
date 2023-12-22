import { createStore, produce } from "solid-js/store";
import {
  ConnectorSection,
  DeepPartial,
  DrawflowData,
  DrawflowNode,
  MouseData,
  NodeConnector,
  Optional,
  SelectableElementCSS,
} from "../drawflow-types";
import { clamp } from "./math-utils";
import { windowSize } from "./screen-utils";
import { createMemo } from "solid-js";
import { intersectionOfSets, isSetEmpty } from "./misc-utils";
import { Vec2 } from "./vec2";
import { Changes } from "./Changes";
import { drawflowEventStore } from "./events";

export const changes = new Changes();
export const [nodes, setNodes] = createStore<Record<string, DrawflowNode>>({});
export const [mouseData, setMouseData] = createStore<MouseData>({
  clickStartPosition: undefined,
  draggingNode: false,
  heldConnectorId: undefined,
  heldNodeId: undefined,
  mousePosition: Vec2.default(),
  heldConnection: undefined,
});
export const [drawflow, setDrawflow] = createStore<DrawflowData>({
  currentMoveSpeed: Vec2.default(),
  position: Vec2.default(),
  zoomLevel: 1,
  pinchDistance: 0,
});

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

export const globalMousePosition = createMemo<Vec2>(() => {
  const zoom = drawflow.zoomLevel; // zoom multiplier

  // TODO: change to drawflow div size instead of screen size
  const screenCenter = windowSize().divideBy(2);

  return mouseData.mousePosition
    .subtract(screenCenter)
    .divideBy(zoom)
    .subtract(drawflow.position)
    .add(screenCenter);
});

export const updateZoom = (distance: number, zoomLocation: Vec2): void => {
  const oldZoom = drawflow.zoomLevel;
  const newZoom = clamp(
    oldZoom + oldZoom * distance * Constants.ZOOM_MULTIPLIER,
    Constants.MIN_ZOOM,
    Constants.MAX_ZOOM,
  );
  if (newZoom < Constants.MIN_ZOOM || newZoom > Constants.MAX_ZOOM) return;
  setMouseData("draggingNode", false);
  const windowDimensions = windowSize();
  const centeredZoomLocation = zoomLocation.subtract(
    windowDimensions.divideBy(2),
  );
  const oldScreenSize = windowDimensions.multiplyBy(oldZoom);
  const newScreenSize = windowDimensions.multiplyBy(newZoom);
  const oldOffset = centeredZoomLocation
    .subtract(oldScreenSize.divideBy(2))
    .divideBy(oldZoom);

  const newOffset = centeredZoomLocation
    .subtract(newScreenSize.divideBy(2))
    .divideBy(newZoom);

  setDrawflow((prev) => ({
    position: prev.position.subtract(oldOffset).add(newOffset),
    zoomLevel: newZoom,
  }));
};

export const updateBackgroundPosition = (
  moveDistance: Vec2,
  keyboard = false,
) => {
  if (mouseData.heldNodeId || keyboard === mouseData.draggingNode) return;
  setDrawflow("position", (prev) =>
    prev.add(moveDistance.divideBy(drawflow.zoomLevel)),
  );
};

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
  setDrawflow("currentMoveSpeed", Vec2.default());
  KEYS.MOVE_LEFT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_RIGHT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_UP.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_DOWN.forEach((key) => heldKeys.delete(key));
};

export const deselectNode = () => {
  setMouseData({
    heldNodeId: undefined,
    heldConnectorId: undefined,
    heldConnection: undefined,
  });
  resetMovement();
};

export const updateNodePosition = (moveSpeed: Vec2) => {
  if (!mouseData.heldNodeId) return;
  const node = nodes[mouseData.heldNodeId];
  if (!node) return;
  setNodes(mouseData.heldNodeId, "position", node.position.add(moveSpeed));
};

setInterval(() => {
  const movingLeft = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_LEFT));
  const movingRight = !isSetEmpty(
    intersectionOfSets(heldKeys, KEYS.MOVE_RIGHT),
  );
  const movingUp = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_UP));
  const movingDown = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_DOWN));

  const isDraggingNode = mouseData.heldNodeId !== undefined;

  const moveSpeed = Vec2.of(
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

  setDrawflow("currentMoveSpeed", moveSpeed);
  if (!mouseData.heldNodeId) {
    updateBackgroundPosition(drawflow.currentMoveSpeed, true);
  } else {
    updateNodePosition(drawflow.currentMoveSpeed);
  }
}, 10);

export const addNode = (
  data: Partial<DrawflowNode>,
  addToHistory = true,
): DrawflowNode => {
  let newNode: Optional<DrawflowNode>;
  setNodes(() => {
    const newId = data.id ?? getNextFreeNodeId();

    newNode = {
      centered: data.centered ?? false,
      connectorSections: data.connectorSections ?? {},
      css: data.css ?? {},
      customData: data.customData ?? ({} as CustomDataType),
      display: data.display ?? (() => undefined),
      id: newId,
      offset: Vec2.default(),
      position: data.position ?? Vec2.default(),
      ref: undefined,
      size: Vec2.default(),
    };

    return {
      [newId]: newNode,
    };
  });

  if (addToHistory) {
    const oldConnections = getAllSourceConnections(newNode!.id);

    changes.addChange({
      type: "add",
      source: "node",
      applyChange: () => {
        addNode(newNode!, false);
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
        removeNode(newNode!.id, false);
      },
    });
  }

  return newNode!;
};

export const updateNode = (
  nodeId: string,
  data: DeepPartial<DrawflowNode>,
  addToHistory = true,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  if (addToHistory) {
    const oldNode = nodes[nodeId];
    const oldConnections = getAllSourceConnections(nodeId);
    const applyChange = () => {
      updateNode(nodeId, data, false);
    };
    const undoChange = () => {
      updateNode(nodeId, oldNode, false);
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

  setNodes(
    nodeId,
    produce((prev) => Object.assign(prev, data)),
  );
};

export const getNextFreeNodeId = (): string => {
  let newId = "0";
  for (let i = 1; Object.keys(nodes).includes(newId); ++i) {
    newId = i.toString();
  }
  return newId;
};

export const getNextFreeConnectorId = (nodeId: string): string => {
  let newId = "0";
  const node = nodes[nodeId];
  if (node) {
    for (
      let i = 1;
      Object.values(node.connectorSections).some((section) =>
        Object.keys(section.connectors).includes(newId),
      );
      ++i
    ) {
      newId = i.toString();
    }
  }

  return newId;
};

export const getNextFreeConnectorSectionId = (nodeId: string): string => {
  let newId = "0";
  const node = nodes[nodeId];
  if (node) {
    for (let i = 1; Object.keys(node.connectorSections).includes(newId); ++i) {
      newId = i.toString();
    }
  }

  return newId;
};

/**
 * Removes a node and all connections to and from it
 * @param nodeId - the id of the node to remove
 * @param addToHistory - whether to add this change to the history
 */
export const removeNode = (nodeId: string, addToHistory = true) => {
  deselectNode();
  setNodes(
    produce((newNodes) => {
      if (addToHistory) {
        const oldConnections = getAllSourceConnections(nodeId);
        const oldNode = nodes[nodeId];

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

      delete newNodes[nodeId];
    }),
  );
};

export const removeIncomingConnections = (nodeId: string) => {
  if (!(nodeId in nodes)) {
    return;
  }

  setNodes(
    nodeId,
    produce((node) => {
      Object.values(node.connectorSections).forEach((section) =>
        Object.values(section.connectors).forEach((connector) => {
          Object.values(connector.sources).forEach(
            ({ sourceConnector }) =>
              (sourceConnector.destinations =
                sourceConnector.destinations.filter(
                  ({ destinationConnector }) =>
                    destinationConnector.parentSection.parentNode.id !== nodeId,
                )),
          );
          connector.sources = [];
        }),
      );
    }),
  );
};

export const removeOutgoingConnections = (nodeId: string) => {
  if (!(nodeId in nodes)) {
    return;
  }

  setNodes(
    nodeId,
    produce((node) => {
      Object.values(node.connectorSections).forEach((section) =>
        Object.values(section.connectors).forEach((connector) => {
          Object.values(connector.destinations).forEach(
            ({ destinationConnector }) =>
              (destinationConnector.sources =
                destinationConnector.sources.filter(
                  ({ sourceConnector }) =>
                    sourceConnector.parentSection.parentNode.id !== nodeId,
                )),
          );
          connector.destinations = [];
        }),
      );
    }),
  );
};

export const getAllSourceConnectors = (nodeId: string): NodeConnector[] => {
  const node = nodes[nodeId];
  if (!node) {
    return [];
  }

  return Object.values(node.connectorSections).reduce(
    (connectors, section) =>
      connectors.concat(
        Object.values(section.connectors).flatMap((connector) =>
          connector.sources.flatMap((source) => source.sourceConnector),
        ),
      ),
    [] as NodeConnector[],
  );
};

export const getAllDestinationConnectors = (
  nodeId: string,
): NodeConnector[] => {
  const node = nodes[nodeId];
  if (!node) {
    return [];
  }

  return Object.values(node.connectorSections).reduce(
    (connectors, section) =>
      connectors.concat(
        Object.values(section.connectors).flatMap((connector) =>
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
  const sourceNode = nodes[sourceNodeId];
  const destinationNode = nodes[destinationNodeId];

  // Check if nodes exist
  if (!sourceNode || !destinationNode) {
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

  const sourceConnector = sourceSection.connectors[sourceConnectorId];
  const destinationConnector =
    destinationSection.connectors[destinationConnectorId];

  // Check if connectors exist
  if (!sourceConnector || !destinationConnector) {
    return;
  }

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

  setNodes(
    produce((prev) => {
      prev[sourceNodeId].connectorSections[sourceSection.id].connectors[
        sourceConnectorId
      ].destinations.push({
        destinationConnector,
        css: css ?? {},
      });

      prev[destinationNodeId].connectorSections[
        destinationSection.id
      ].connectors[destinationConnectorId].sources.push({ sourceConnector });
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
  const sourceNode = nodes[sourceNodeId];
  const destinationNode = nodes[destinationNodeId];

  // Check if nodes exist
  if (!sourceNode || !destinationNode) {
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

  const sourceConnector = sourceSection.connectors[sourceConnectorId];
  const destinationConnector =
    destinationSection.connectors[destinationConnectorId];

  // Check if connectors exist
  if (!sourceConnector || !destinationConnector) {
    return;
  }

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

  setNodes(
    produce((prev) => {
      prev[sourceNodeId].connectorSections[sourceSection.id].connectors[
        sourceConnectorId
      ].destinations = sourceConnector.destinations.filter(
        (destination) =>
          destination.destinationConnector.parentSection.parentNode.id !==
          destinationNodeId,
      );

      prev[destinationNodeId].connectorSections[
        destinationSection.id
      ].connectors[destinationConnectorId].sources =
        destinationConnector.sources.filter(
          (source) =>
            source.sourceConnector.parentSection.parentNode.id !== sourceNodeId,
        );
    }),
  );
};

export const addConnector = (
  nodeId: string,
  sectionId: string,
  connectorId: Optional<string>,
  data: Partial<NodeConnector>,
  addToHistory = true,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  const section = node.connectorSections[sectionId];
  if (!section) {
    return;
  }

  if (!connectorId || Object.keys(section.connectors).includes(connectorId)) {
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

  setNodes(nodeId, "connectorSections", sectionId, "connectors", connectorId, {
    css: data?.css,
    destinations: data?.destinations ?? [],
    hovered: data?.hovered,
    id: connectorId,
    parentSection: section,
    position: data?.position ?? Vec2.default(),
    ref: undefined,
    size: Vec2.default(),
    sources: data?.sources ?? [],
  });
};

export const removeConnector = (
  nodeId: string,
  sectionId: string,
  connectorId: string,
  addToHistory = true,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  const section = node.connectorSections[sectionId];
  if (!section) {
    return;
  }

  const connector = section.connectors[connectorId];
  if (!connector) {
    return;
  }

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

  setNodes(
    nodeId,
    "connectorSections",
    sectionId,
    "connectors",
    produce((prev) => {
      delete prev[connectorId];
    }),
  );
};

export const getConnectorCount = (nodeId: string) => {
  const node = nodes[nodeId];
  if (!node) {
    return 0;
  }

  return Object.values(node.connectorSections).reduce(
    (total, section) => total + Object.keys(section.connectors).length,
    0,
  );
};

export const getConnector = (
  nodeId: string,
  connectorId: string,
): Optional<NodeConnector> => {
  const node = nodes[nodeId];
  if (!node) {
    return undefined;
  }

  return getSectionFromConnector(nodeId, connectorId)?.connectors?.[
    connectorId
  ];
};

export const getSectionFromConnector = (
  nodeId: string,
  connectorId: string,
): Optional<ConnectorSection> => {
  const node = nodes[nodeId];
  if (!node) {
    return undefined;
  }

  return Object.values(node.connectorSections).find(
    (section) => section.connectors[connectorId],
  );
};

export const addConnectorSection = (
  nodeId: string,
  sectionId?: string,
  css?: string,
  addToHistory = true,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  if (!sectionId || Object.keys(node.connectorSections).includes(sectionId)) {
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

  setNodes(nodeId, "connectorSections", sectionId, {
    connectors: {},
    css,
    id: sectionId,
    parentNode: node,
  });
};

export const removeConnectorSection = (
  nodeId: string,
  sectionId: string,
  addToHistory = true,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  const section = node.connectorSections[sectionId];
  if (!section) {
    return;
  }

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

  setNodes(
    nodeId,
    "connectorSections",
    produce((prev) => {
      delete prev[sectionId];
    }),
  );
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
  const node = nodes[nodeId];
  if (!node) {
    return [];
  }

  return Object.values(node.connectorSections).reduce(
    (connectors, section) =>
      connectors.concat(Object.values(section.connectors)),
    [] as NodeConnector[],
  );
};

export const startCreatingConnection = (
  nodeId: string,
  position: Vec2,
  outputId: string,
) => {
  setMouseData({
    draggingNode: false,
    heldNodeId: nodeId,
    heldConnectorId: outputId,
    mousePosition: position,
    clickStartPosition: position
      .divideBy(drawflow.zoomLevel)
      .subtract(nodes[nodeId]!.position),
  });
};

export const selectNode = (nodeId: string, position: Vec2) => {
  setMouseData({
    draggingNode: true,
    heldConnectorId: undefined,
    heldConnection: undefined,
    heldNodeId: nodeId,
    mousePosition: position,
    clickStartPosition: position
      .divideBy(drawflow.zoomLevel)
      .subtract(nodes[nodeId]!.position),
  });
};
