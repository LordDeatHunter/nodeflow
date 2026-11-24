import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import { NodeflowData, Vec2 } from "@nodeflow-lib/core";

/**
 * A group's title. With `canRenameGroups`, double-clicking it swaps in an
 * input: Enter or leaving it saves, Escape cancels.
 */
const GroupTitle: Component<{
  title: string;
  groupId: string;
  nodeflowData: NodeflowData;
}> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const stop = (event: Event) => event.stopPropagation();

  return (
    <Show
      when={editing()}
      fallback={
        <span
          class="nodeflowGroupTitle"
          title={
            props.nodeflowData.settings.canRenameGroups
              ? "Double-click to rename"
              : undefined
          }
          onDblClick={(event) => {
            if (!props.nodeflowData.settings.canRenameGroups) return;
            event.stopPropagation();
            setEditing(true);
          }}
        >
          {props.title}
        </span>
      }
    >
      {(() => {
        let done = false;
        const finish = (value: string | undefined) => {
          if (done) return;
          done = true;
          setEditing(false);
          if (value !== undefined) {
            props.nodeflowData.renameGroup(props.groupId, value);
          }
        };
        return (
          <input
            class="nodeflowGroupTitle nodeflowGroupTitleInput"
            value={untrack(() => props.title)}
            aria-label="Group name"
            ref={(el) =>
              requestAnimationFrame(() => {
                el.focus();
                el.select();
              })
            }
            onMouseDown={stop}
            onTouchStart={stop}
            onPointerDown={stop}
            onDblClick={stop}
            onKeyDown={(event) => {
              // Keep typing (e.g. Delete) away from the canvas shortcuts.
              event.stopPropagation();
              if (event.key === "Enter") finish(event.currentTarget.value);
              else if (event.key === "Escape") finish(undefined);
            }}
            onBlur={(event) => finish(event.currentTarget.value)}
          />
        );
      })()}
    </Show>
  );
};

interface GroupProps {
  groupId: string;
  nodeflowData: NodeflowData;
  tick: () => number;
}

/**
 * Draws a group: a frame with a header behind its members while expanded, or
 * a single box in their place while collapsed.
 */
const NodeflowGroup: Component<GroupProps> = (props) => {
  const group = createMemo(() => {
    props.tick();
    return props.nodeflowData.groups.get(props.groupId);
  });

  const state = createMemo(
    () => {
      props.tick();
      const current = props.nodeflowData.groups.get(props.groupId);
      if (!current) return undefined;

      return {
        title: current.title,
        collapsed: current.collapsed,
        count: current.members.length,
        rect: current.getRect(),
        selected: current.isSelected(),
        css: current.css,
      };
    },
    undefined,
    {
      equals: (prev, next) =>
        prev?.title === next?.title &&
        prev?.collapsed === next?.collapsed &&
        prev?.count === next?.count &&
        prev?.selected === next?.selected &&
        prev?.css === next?.css &&
        prev?.rect?.position.equals(next?.rect?.position ?? Vec2.zero()) ===
          true &&
        prev?.rect?.size.equals(next?.rect?.size ?? Vec2.zero()) === true,
    },
  );

  const onMouseDown = (event: MouseEvent) =>
    props.nodeflowData.eventStore.onMouseDownInGroup.publish({
      event,
      groupId: props.groupId,
    });

  const onTouchStart = (event: TouchEvent) =>
    props.nodeflowData.eventStore.onTouchStartInGroup.publish({
      event,
      groupId: props.groupId,
    });

  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
    props.nodeflowData.eventStore.onGroupCollapseToggled.publish({
      groupId: props.groupId,
    });
  };

  // Keeps the toggle from starting a drag.
  const stop = (event: Event) => event.stopPropagation();

  const position = () => state()?.rect?.position ?? Vec2.zero();

  return (
    <Show when={state()?.rect}>
      <Show
        when={state()?.collapsed}
        fallback={
          <div
            class="nodeflowGroupFrame"
            classList={{
              [state()?.css.frame ?? ""]: true,
              [state()?.css.selected ?? ""]: state()?.selected,
            }}
            data-nodeflow-group={props.groupId}
            style={{
              transform: `translate(${position().x}px, ${position().y}px)`,
              width: `${state()!.rect!.size.x}px`,
              height: `${state()!.rect!.size.y}px`,
            }}
          >
            <div
              class="nodeflowGroupHeader"
              classList={{ [state()?.css.header ?? ""]: true }}
              style={{
                height: `${props.nodeflowData.settings.groupHeaderHeight}px`,
              }}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              <GroupTitle
                title={state()?.title ?? ""}
                groupId={props.groupId}
                nodeflowData={props.nodeflowData}
              />
              <button
                type="button"
                class="nodeflowGroupToggle"
                title="Collapse group"
                onMouseDown={stop}
                onTouchStart={stop}
                onClick={toggle}
              >
                −
              </button>
            </div>
          </div>
        }
      >
        <div
          ref={(el) => {
            const measure = () =>
              group()?.updateCollapsedSize(
                Vec2.of(el.offsetWidth, el.offsetHeight),
              );
            const observer = new ResizeObserver(measure);
            observer.observe(el);
            onCleanup(() => observer.disconnect());
            createEffect(() => {
              state();
              measure();
            });
          }}
          class="nodeflowGroupCollapsed"
          classList={{
            [state()?.css.collapsed ?? ""]: true,
            [state()?.css.selected ?? ""]: state()?.selected,
          }}
          data-nodeflow-group={props.groupId}
          style={{
            transform: `translate(${position().x}px, ${position().y}px)`,
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <GroupTitle
            title={state()?.title ?? ""}
            groupId={props.groupId}
            nodeflowData={props.nodeflowData}
          />
          <span class="nodeflowGroupCount">{state()?.count}</span>
          <button
            type="button"
            class="nodeflowGroupToggle"
            title="Expand group"
            onMouseDown={stop}
            onTouchStart={stop}
            onClick={toggle}
          >
            +
          </button>
        </div>
      </Show>
    </Show>
  );
};

export default NodeflowGroup;
