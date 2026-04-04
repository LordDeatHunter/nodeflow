<script lang="ts">
  let { id, position } = $props<{ id: string; position: { x: number; y: number } }>();
</script>

<div style="padding: 14px 18px; min-width: 140px; background: #16213e; border-radius: 8px; border: 1px solid #0f3460; color: #e2e2e2; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; line-height: 1.4;">
  <strong style="display: block; margin-bottom: 2px; font-size: 14px; color: #fff;">Node {id}</strong>
  <span style="opacity: 0.5; font-size: 11px;">Position {position.x}, {position.y}</span>
</div>
