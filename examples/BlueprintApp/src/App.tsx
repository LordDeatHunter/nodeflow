import {
  type Component,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  createSolidNodeflow,
  NodeflowData,
  NodeflowRegistry,
  NodeTemplate,
  Optional,
  Vec2,
} from "@nodeflow-lib/solid";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";
import appCss from "./styles/app.module.scss";
import NewNodeSlot from "./NewNodeSlot";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import DerivedTypeEditor from "./DerivedTypeEditor";
import SelectionToolbar from "./SelectionToolbar";
import SavedTypeDialogs, { SavedTypeDialogState } from "./SavedTypeDialogs";
import {
  editorData,
  editorSession,
  isTypeLockedInEditor,
  openTemplateEditor,
} from "./editor";
import { syncBackgroundGrid } from "./backgroundGrid";
import { BLUEPRINT_SETTINGS } from "./settings";
import {
  createBlueprintNode,
  NodeType,
  resolveNodeDisplay,
  setupDemoGraph,
  setupEvents,
  setupSavedTypePersistence,
  spawnSavedType,
} from "./utils";
import { BPCurveFunctions } from "./BPCurveFunctions";

const [nodeflowData, Nodeflow] = createSolidNodeflow(
  "main",
  {
    ...BLUEPRINT_SETTINGS,
    resolveNodeDisplay: (node) => resolveNodeDisplay(node),
  },
  (nodeflow: NodeflowData) => new BPCurveFunctions(nodeflow),
);

const PREVIEW_LABELS: Record<NodeType, string> = {
  number: "Number node",
  operation: "Operator node",
  negation: "Negation node",
  plusMinus: "Plus-minus node",
  display: "Display node",
};

const BUILT_IN_TYPES: Array<NodeType> = [
  "number",
  "operation",
  "negation",
  "plusMinus",
  "display",
];

type Preview =
  | { kind: "node"; type: NodeType }
  | { kind: "saved"; templateId: string; name: string };

const labelOf = (entry: Preview) =>
  entry.kind === "node" ? PREVIEW_LABELS[entry.type] : entry.name;

/** An open palette context menu, for the entry it was opened on. */
type PaletteMenu = { x: number; y: number; entry: Preview };

/** The canvas the palette adds to: the type editor while it is open. */
const activeCanvas = () => (editorSession() ? editorData : nodeflowData);

const App: Component = () => {
  const [nodePreview, setNodePreview] =
    createSignal<Optional<Preview>>(undefined);
  const [cursor, setCursor] = createSignal(Vec2.of(0, 0));
  const [savedTypes, setSavedTypes] = createSignal<Array<NodeTemplate>>([]);
  const [menu, setMenu] = createSignal<Optional<PaletteMenu>>(undefined);
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [dialog, setDialog] =
    createSignal<Optional<SavedTypeDialogState>>(undefined);
  let palette: HTMLDivElement | undefined;

  const openMenu = (entry: Preview, x: number, y: number) => {
    // A right-click or long press is not a drag.
    setNodePreview(undefined);
    setMenu({ x, y, entry });
  };

  const menuItems = (entry: Preview): Array<ContextMenuItem> => {
    const spawn = () => {
      const canvas = activeCanvas();
      const center = canvas.center();
      if (entry.kind === "node") {
        createBlueprintNode(entry.type, center, true, canvas);
      } else spawnSavedType(entry.templateId, center, true, canvas);
    };
    if (entry.kind === "node") return [{ label: "Spawn", onSelect: spawn }];
    return [
      { label: "Spawn", onSelect: spawn },
      // Opening another type would throw away the edit in progress.
      ...(editorSession()
        ? []
        : [
            {
              label: "Edit",
              onSelect: () => openTemplateEditor(entry.templateId),
            },
          ]),
      {
        label: "Rename",
        onSelect: () =>
          setDialog({ kind: "rename", templateId: entry.templateId }),
      },
      {
        label: "Export",
        onSelect: () =>
          setDialog({ kind: "export", templateIds: [entry.templateId] }),
      },
      {
        label: "Delete",
        danger: true,
        onSelect: () => nodeflowData.templates.remove(entry.templateId),
      },
    ];
  };

  const startPreview = (preview: Preview, event: PointerEvent) => {
    setCursor(Vec2.of(event.clientX, event.clientY));
    setNodePreview(preview);
  };

  const createNode = (data: { event: PointerEvent }) => {
    const preview = nodePreview();
    if (!preview) return;

    setNodePreview(undefined);

    const canvas = activeCanvas();
    const clickPos = Vec2.fromEvent(data.event);
    const nodeflowPosition = canvas.startPosition;
    const nodeflowSize = canvas.size;

    if (!clickPos.isWithinRect(nodeflowPosition, nodeflowSize)) return;
    // The open palette covers the bottom of the canvas; dropping on it
    // cancels the drag. Tested by point, since touch pointerups target the
    // slot the drag began on.
    const paletteRect = palette?.getBoundingClientRect();
    if (paletteRect && clickPos.y >= paletteRect.top) return;

    const nodePosition = clickPos
      .subtract(nodeflowPosition)
      .divideBy(canvas.zoomLevel)
      .subtract(canvas.position);

    if (preview.kind === "node") {
      createBlueprintNode(preview.type, nodePosition, true, canvas);
    } else {
      spawnSavedType(preview.templateId, nodePosition, true, canvas);
    }
  };

  onMount(() => {
    setupEvents();
    setupSavedTypePersistence();
    setupDemoGraph();
    onCleanup(syncBackgroundGrid(nodeflowData));

    setSavedTypes(nodeflowData.templates.list());
    nodeflowData.eventStore.onTemplatesChanged.subscribe(
      "blueprint:palette",
      ({ templates }) => setSavedTypes([...templates]),
    );

    NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.subscribe(
      "blueprint:track-cursor",
      ({ event }) => setCursor(Vec2.of(event.clientX, event.clientY)),
    );

    NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.subscribe(
      "create-node",
      createNode,
    );
  });

  const previewLabel = () => {
    const preview = nodePreview();
    return preview ? labelOf(preview) : "";
  };

  return (
    <div class={appCss.app}>
      <div class={appCss.viewport}>
        <Nodeflow
          css={{
            getNewCurveCss: () => curveCss.newConnection,
            nodeflow: nodeflowCss.nodeflow,
          }}
          height="100%"
          width="100%"
        />
        {/* The editor covers the main canvas and has its own toolbar. */}
        <Show when={!editorSession()}>
          <SelectionToolbar nodeflow={nodeflowData} />
        </Show>
        <Show when={editorSession()}>
          <DerivedTypeEditor />
        </Show>
      </div>
      <div
        ref={palette}
        class={appCss.palette}
        classList={{ [appCss.paletteOpen]: paletteOpen() }}
      >
        <button
          type="button"
          class={appCss.paletteToggle}
          aria-expanded={paletteOpen()}
          aria-controls="node-palette"
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2 8l4-4 4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {paletteOpen() ? "Hide nodes" : "Nodes"}
        </button>
        <div
          id="node-palette"
          class={appCss.hotbar}
          // Closed: out of the tab order and away from screen readers.
          inert={!paletteOpen() || undefined}
        >
          <div class={appCss.hotbarHeader}>
            <h1 class={appCss.hotbarTitle}>Node palette</h1>
            <p class={appCss.hotbarHint}>
              <Show
                when={editorSession()}
                fallback={
                  <>
                    Drag a node onto the canvas to add it, or right-click
                    (long-press) it for more. Select nodes to group them or turn
                    them into a derived node.
                  </>
                }
              >
                Drag a node into the type being edited to add it. The type
                itself, and types built from it, can't be added.
              </Show>
            </p>
            <div class={appCss.hotbarActions}>
              <button
                type="button"
                class={appCss.linkButton}
                onClick={() => setDialog({ kind: "import" })}
              >
                Import types
              </button>
              <Show when={savedTypes().length > 0}>
                <button
                  type="button"
                  class={appCss.linkButton}
                  onClick={() => setDialog({ kind: "export" })}
                >
                  Export all types
                </button>
              </Show>
            </div>
          </div>
          <div class={appCss.slots}>
            <For each={BUILT_IN_TYPES}>
              {(type) => (
                <NewNodeSlot
                  onClick={(event) =>
                    startPreview({ kind: "node", type }, event)
                  }
                  onContextMenu={(x, y) =>
                    openMenu({ kind: "node", type }, x, y)
                  }
                >
                  {PREVIEW_LABELS[type]}
                </NewNodeSlot>
              )}
            </For>
            <For each={savedTypes()}>
              {(template) => (
                <NewNodeSlot
                  saved
                  disabled={isTypeLockedInEditor(template.id)}
                  disabledReason="A type can't contain itself"
                  onClick={(event) =>
                    startPreview(
                      {
                        kind: "saved",
                        templateId: template.id,
                        name: template.name,
                      },
                      event,
                    )
                  }
                  onContextMenu={(x, y) =>
                    openMenu(
                      {
                        kind: "saved",
                        templateId: template.id,
                        name: template.name,
                      },
                      x,
                      y,
                    )
                  }
                  onRemove={
                    isTypeLockedInEditor(template.id)
                      ? undefined
                      : () => nodeflowData.templates.remove(template.id)
                  }
                >
                  {template.name}
                </NewNodeSlot>
              )}
            </For>
          </div>
        </div>
      </div>
      <Show when={nodePreview()}>
        <div
          class={appCss.previewCard}
          style={{
            left: `${cursor().x - 75}px`,
            top: `${cursor().y - 45}px`,
          }}
        >
          {previewLabel()}
        </div>
      </Show>
      <Show when={menu()}>
        {(open) => (
          <ContextMenu
            x={open().x}
            y={open().y}
            title={labelOf(open().entry)}
            items={menuItems(open().entry)}
            onClose={() => setMenu(undefined)}
          />
        )}
      </Show>
      <Show when={dialog()} keyed>
        {(open) => (
          <SavedTypeDialogs
            dialog={open}
            onClose={() => setDialog(undefined)}
          />
        )}
      </Show>
    </div>
  );
};

export { nodeflowData };
export default App;
