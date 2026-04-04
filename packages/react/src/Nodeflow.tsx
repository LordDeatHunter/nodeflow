import { useEffect, useRef } from "react";
import type { HTMLAttributes } from "react";
import { createVanillaNodeflow, NodeflowRegistry } from "@nodeflow/vanilla";
import type { NodeflowData, NodeflowSettings } from "@nodeflow/vanilla";

type NodeflowProps = HTMLAttributes<HTMLDivElement> & {
  id: string;
  options?: Partial<NodeflowSettings>;
  onReady?: (data: NodeflowData) => void;
};

export function Nodeflow({
  id,
  options,
  onReady,
  style,
  ...rest
}: NodeflowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodeflowData = createVanillaNodeflow(id, container, options);

    if (onReady) {
      onReady(nodeflowData);
    }

    return () => {
      NodeflowRegistry.get().removeNodeflow(id);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", ...style }}
      {...rest}
    />
  );
}
