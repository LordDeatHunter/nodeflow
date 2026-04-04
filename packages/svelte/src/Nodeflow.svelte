<script lang="ts">
  import type { NodeflowData, NodeflowSettings } from "@nodeflow/vanilla";
  import { createVanillaNodeflow } from "@nodeflow/vanilla";

  interface Props {
    id: string;
    options?: Partial<NodeflowSettings>;
    onready?: (data: NodeflowData) => void;
    [key: string]: unknown;
  }

  let { id, options, onready, ...restProps }: Props = $props();

  let container: HTMLDivElement;

  $effect(() => {
    const nodeflowData = createVanillaNodeflow(id, container, options);
    onready?.(nodeflowData);
  });
</script>

<div bind:this={container} style="width: 100%; height: 100%;" {...restProps}></div>
