import { defineComponent, h, onMounted, ref } from "vue";
import { createVanillaNodeflow } from "@nodeflow-lib/vanilla";
import type { NodeflowData, NodeflowSettings } from "@nodeflow-lib/vanilla";

export const Nodeflow = defineComponent({
  name: "Nodeflow",
  props: {
    id: { type: String, required: true },
    options: {
      type: Object as () => Partial<NodeflowSettings>,
      default: undefined,
    },
  },
  emits: ["ready"],
  setup(props, { emit }) {
    const containerRef = ref<HTMLDivElement | null>(null);

    onMounted(() => {
      const nodeflowData: NodeflowData = createVanillaNodeflow(
        props.id,
        containerRef.value as HTMLElement,
        props.options,
      );
      emit("ready", nodeflowData);
    });

    return () =>
      h("div", { ref: containerRef, style: { width: "100%", height: "100%" } });
  },
});
