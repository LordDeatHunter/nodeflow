import { defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import {
  createVanillaNodeflow,
  destroyVanillaNodeflow,
  type NodeflowCss,
  type NodeflowData,
  type NodeflowSettings,
} from "@nodeflow-lib/vanilla";

export const Nodeflow = defineComponent({
  name: "Nodeflow",
  props: {
    id: { type: String, required: true },
    options: {
      type: Object as () => Partial<NodeflowSettings>,
      default: undefined,
    },
    /** Extra classes for the canvas and the in-progress connection curve. */
    css: {
      type: Object as () => NodeflowCss,
      default: undefined,
    },
  },
  emits: ["ready"],
  setup(props, { emit }) {
    const containerRef = ref<HTMLDivElement | null>(null);
    let nodeflowData: NodeflowData | undefined;

    onMounted(() => {
      nodeflowData = createVanillaNodeflow(
        props.id,
        containerRef.value as HTMLElement,
        props.options,
        { css: props.css },
      );
      emit("ready", nodeflowData);
    });

    onBeforeUnmount(() => {
      if (nodeflowData) destroyVanillaNodeflow(nodeflowData);
      nodeflowData = undefined;
    });

    return () =>
      h("div", { ref: containerRef, style: { width: "100%", height: "100%" } });
  },
});
