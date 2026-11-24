<script lang="ts">
  import { onMount } from "svelte";
  import type {
    NodeflowCss,
    NodeflowData,
    NodeflowSettings,
  } from "@nodeflow-lib/vanilla";
  import {
    createVanillaNodeflow,
    destroyVanillaNodeflow,
  } from "@nodeflow-lib/vanilla";

  interface Props {
    id: string;
    options?: Partial<NodeflowSettings>;
    /** Extra classes for the canvas and the in-progress connection curve. */
    css?: NodeflowCss;
    onready?: (data: NodeflowData) => void;
    [key: string]: unknown;
  }

  let { id, options, css, onready, ...restProps }: Props = $props();

  let container: HTMLDivElement;

  // Created once on mount, like the other adapters; prop changes do not
  // rebuild the canvas.
  onMount(() => {
    const nodeflowData = createVanillaNodeflow(id, container, options, { css });
    onready?.(nodeflowData);
    return () => destroyVanillaNodeflow(nodeflowData);
  });
</script>

<div bind:this={container} style="width: 100%; height: 100%;" {...restProps}></div>
