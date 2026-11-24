import { NodeflowData, NodeflowGroupData, Vec2 } from "@nodeflow-lib/core";

export interface GroupElement {
  root: HTMLDivElement;
  title: HTMLSpanElement;
  count?: HTMLSpanElement;
  collapsed: boolean;
  observer?: ResizeObserver;
  /** Last rendered state, so unchanged groups skip DOM writes. */
  key: string;
}

const createToggle = (
  data: NodeflowData,
  groupId: string,
  collapsed: boolean,
): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nodeflowGroupToggle";
  button.title = collapsed ? "Expand group" : "Collapse group";
  button.textContent = collapsed ? "+" : "−";

  // Keeps the toggle from starting a drag.
  button.addEventListener("mousedown", (event) => event.stopPropagation());
  button.addEventListener("touchstart", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    data.eventStore.onGroupCollapseToggled.publish({ groupId });
  });

  return button;
};

const addDragListeners = (
  el: HTMLElement,
  data: NodeflowData,
  groupId: string,
): void => {
  el.addEventListener("mousedown", (event) =>
    data.eventStore.onMouseDownInGroup.publish({ event, groupId }),
  );
  el.addEventListener("touchstart", (event) =>
    data.eventStore.onTouchStartInGroup.publish({ event, groupId }),
  );
};

/**
 * Renders a group: a frame with a header while expanded, or a single box
 * while collapsed. `syncGroups` re-renders it when it collapses or expands.
 */
export const renderGroup = (
  parent: HTMLElement,
  before: Node | null,
  group: NodeflowGroupData,
  data: NodeflowData,
  groupElements: Map<string, GroupElement>,
): GroupElement => {
  const root = document.createElement("div");
  root.dataset.nodeflowGroup = group.id;
  root.style.left = "0";
  root.style.top = "0";

  const title = document.createElement("span");
  title.className = "nodeflowGroupTitle";
  addRenameListener(title, data, group.id);

  let element: GroupElement;

  if (group.collapsed) {
    root.className = "nodeflowGroupCollapsed";
    const count = document.createElement("span");
    count.className = "nodeflowGroupCount";
    root.append(title, count, createToggle(data, group.id, true));
    addDragListeners(root, data, group.id);

    const observer = new ResizeObserver(() =>
      data.groups
        .get(group.id)
        ?.updateCollapsedSize(Vec2.of(root.offsetWidth, root.offsetHeight)),
    );
    observer.observe(root);

    element = { root, title, count, collapsed: true, observer, key: "" };
  } else {
    root.className = "nodeflowGroupFrame";
    const header = document.createElement("div");
    header.className = "nodeflowGroupHeader";
    header.append(title, createToggle(data, group.id, false));
    addDragListeners(header, data, group.id);
    root.appendChild(header);

    element = { root, title, collapsed: false, key: "" };
  }

  parent.insertBefore(root, before);
  groupElements.set(group.id, element);
  return element;
};

/**
 * With `canRenameGroups`, double-clicking a group's title swaps in an input:
 * Enter or leaving it saves, Escape cancels.
 */
const addRenameListener = (
  title: HTMLSpanElement,
  data: NodeflowData,
  groupId: string,
): void => {
  title.addEventListener("dblclick", (event) => {
    if (!data.settings.canRenameGroups) return;
    event.stopPropagation();

    const input = document.createElement("input");
    input.className = "nodeflowGroupTitle nodeflowGroupTitleInput";
    input.setAttribute("aria-label", "Group name");
    input.value = data.groups.get(groupId)?.title ?? title.textContent ?? "";

    let done = false;
    const finish = (save: boolean) => {
      if (done) return;
      done = true;
      input.replaceWith(title);
      if (save) data.renameGroup(groupId, input.value);
    };

    const stop = (inner: Event) => inner.stopPropagation();
    ["mousedown", "touchstart", "pointerdown", "dblclick"].forEach((type) =>
      input.addEventListener(type, stop),
    );
    input.addEventListener("keydown", (inner) => {
      // Keep typing (e.g. Delete) away from the canvas shortcuts.
      inner.stopPropagation();
      if (inner.key === "Enter") finish(true);
      else if (inner.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));

    title.replaceWith(input);
    input.focus();
    input.select();
  });
};

export const unmountGroup = (
  groupId: string,
  groupElements: Map<string, GroupElement>,
): void => {
  const element = groupElements.get(groupId);
  if (!element) return;

  element.observer?.disconnect();
  element.root.remove();
  groupElements.delete(groupId);
};

const updateGroupElement = (
  element: GroupElement,
  group: NodeflowGroupData,
  data: NodeflowData,
): void => {
  const rect = group.getRect();
  const members = group.members.length;
  const selected = group.isSelected();
  const headerHeight = data.settings.groupHeaderHeight;
  const { css } = group;

  const key = [
    rect?.position.x,
    rect?.position.y,
    rect?.size.x,
    rect?.size.y,
    group.title,
    members,
    selected,
    headerHeight,
    css.frame,
    css.header,
    css.collapsed,
    css.selected,
  ].join("|");
  if (key === element.key) return;
  element.key = key;

  const { root } = element;
  root.style.display = rect ? "" : "none";
  if (!rect) return;

  root.style.transform = `translate(${rect.position.x}px, ${rect.position.y}px)`;
  element.title.textContent = group.title;

  const baseClass = element.collapsed
    ? "nodeflowGroupCollapsed"
    : "nodeflowGroupFrame";
  const customClass = element.collapsed ? css.collapsed : css.frame;
  root.className = [
    baseClass,
    customClass,
    selected ? css.selected : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  if (element.collapsed) {
    element.count!.textContent = String(members);
  } else {
    root.style.width = `${rect.size.x}px`;
    root.style.height = `${rect.size.y}px`;
    const header = root.firstElementChild as HTMLElement;
    header.style.height = `${headerHeight}px`;
    header.className = ["nodeflowGroupHeader", css.header]
      .filter(Boolean)
      .join(" ");
  }
};

/**
 * Mounts, updates and unmounts group elements to match `data.groups`. Groups
 * are inserted before `before`, so they sit beneath curves and nodes.
 */
export const syncGroups = (
  parent: HTMLElement,
  before: Node | null,
  data: NodeflowData,
  groupElements: Map<string, GroupElement>,
): void => {
  groupElements.forEach((element, groupId) => {
    const group = data.groups.get(groupId);
    if (!group || group.collapsed !== element.collapsed) {
      unmountGroup(groupId, groupElements);
    }
  });

  data.groups.forEach((group, groupId) => {
    const element =
      groupElements.get(groupId) ??
      renderGroup(parent, before, group, data, groupElements);
    updateGroupElement(element, group, data);
  });
};
