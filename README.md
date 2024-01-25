![NodeFlow](./assets/logo.png)
[![GitHub activity](https://img.shields.io/github/last-commit/LordDeatHunter/nodeflow/master?style=for-the-badge&logo=github)](https://github.com/LordDeatHunter/nodeflow)
[![Static Badge](https://img.shields.io/npm/v/nodeflow-lib?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/nodeflow-lib)

A library that aims to provide everything needed for making flowcharts, graphs, diagrams, and other similar things using
a simple and intuitive API.\
Currently, NodeFlow is built using [SolidJS](https://www.solidjs.com/), but there are plans to make it
framework-agnostic in the future.

## Features

- 🔍 Zooming and panning
- 🤚 Dragging, selecting, and connecting nodes
- 🎨 Fully customizable styling for every element (nodes, connectors, connector-sections, etc.)
- 📦 Customizable node content
- 📒 History (undo/redo)
- ⤵️ Connection curves

## Installation

```shell
npm install nodeflow
```

## Usage

📚 The [Wiki page](https://github.com/LordDeatHunter/nodeflow/wiki) covers most of the features of NodeFlow.

Below is a simple example that covers adding 2 nodes and connecting them:
```tsx
import { NodeflowLib } from "nodeflow-lib";

// Create a canvas with id "main".
// nodeflowData contains the data of the canvas
// Nodeflow is the canvas element (currently a SolidJS component)
const [nodeflowData, Nodeflow] = NodeflowLib.get().createCanvas("main");

// create the nodes
const sourceNode = nodeflowData.addNode({
  position: { x: 100, y: 100 },
  content: (nodeData) => <div>{nodeData.position}</div>,
});
const destinationNode = nodeflowData.addNode({
  position: { x: 400, y: 400 },
  content: (nodeData) => <div>Node 2!</div>,
});

// add a connector section to the nodes
const outputSection = sourceNode.addConnectorSection("output");
const inputSection = node2.addConnectorSection("input");

// add a connector to each connector section
outputSection.addConnector({ id: "source-connector" });
connectorSection2.addConnector({ id: "target-connector" });

// connect the connectors
nodeflowData.addConnection({
  sourceNodeId: sourceNode.id,
  sourceConnectorId: "source-connector",
  destinationNodeId: destinationNode.id,
  destinationConnectorId: "target-connector",
});
```

For rendering the canvas, you just use the `Nodeflow` component:
```tsx
<Nodeflow width="800px" height="800px" />
```

## Examples

There are 2 example projects: 👨‍👩‍👧‍👦 a [FamilyTree App](./examples/FamilyTreeApp) and 📘 a [Blueprint App](./examples/BlueprintApp).\
For the time being, the examples are not hosted anywhere, so you will have to clone the repository and run them locally.