import { useEffect, useRef, type HTMLAttributes } from "react";
import {
  createVanillaNodeflow,
  destroyVanillaNodeflow,
  type NodeflowCss,
  type NodeflowData,
  type NodeflowSettings,
} from "@nodeflow-lib/vanilla";

type NodeflowProps = HTMLAttributes<HTMLDivElement> & {
  id: string;
  options?: Partial<NodeflowSettings>;
  /** Extra classes for the canvas and the in-progress connection curve. */
  css?: NodeflowCss;
  onReady?: (data: NodeflowData) => void;
};

export const Nodeflow = ({
  id,
  options,
  css,
  onReady,
  style,
  ...rest
}: NodeflowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodeflowData = createVanillaNodeflow(id, container, options, {
      css,
    });

    if (onReady) {
      onReady(nodeflowData);
    }

    return () => destroyVanillaNodeflow(nodeflowData);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", ...style }}
      {...rest}
    />
  );
};
