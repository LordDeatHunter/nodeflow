<script setup lang="ts">
defineProps<{
  id: string;
  position: { x: number; y: number };
}>();
</script>

<template>
  <div
    :style="{
      padding: '14px 18px',
      minWidth: '140px',
      background: '#16213e',
      borderRadius: '8px',
      border: '1px solid #0f3460',
      color: '#e2e2e2',
      fontFamily: `'Segoe UI', system-ui, sans-serif`,
      fontSize: '13px',
      lineHeight: '1.4',
    }"
  >
    <strong
      :style="{
        display: 'block',
        marginBottom: '2px',
        fontSize: '14px',
        color: '#fff',
      }"
    >
      Node {{ id }}
    </strong>
    <span
      :style="{
        opacity: '0.5',
        fontSize: '11px',
      }"
    >
      Position {{ position.x.toFixed(0) }}, {{ position.y.toFixed(0) }}
    </span>
  </div>
</template>
