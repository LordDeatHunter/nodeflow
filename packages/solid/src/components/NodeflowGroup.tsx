import {
  type Component,
  createEffect,
  createMemo,
  onCleanup,
  Show,
} from "solid-js";
import { NodeflowData, Vec2 } from "@nodeflow-lib/core";

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
              <span class="nodeflowGroupTitle">{state()?.title}</span>
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
          <span class="nodeflowGroupTitle">{state()?.title}</span>
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
