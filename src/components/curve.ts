import { NodeflowData } from "../utils";
import { PathData } from "../nodeflow-types";

interface CurveProps {
  css?: string;
  nodeflowData: NodeflowData;
}

// const Curve: Component<CurveProps> = (props) => {
//   return (
//     <svg>
//       <path
//         d={curveData()?.path}
//         class={props.css}
//       />
//       <Show when={props.nodeflowData.settings.debugMode}>
//         <circle/>
//       </Show>
//     </svg>
//   );
// };

const createDebugCircles = (props: CurveProps, data: Partial<PathData>) => {
  if (!data.anchorStart || !data.anchorEnd) {
    return [];
  }

  return [data.anchorStart, data.anchorEnd].map((anchor) => {
    const circle = document.createElement("circle");
    circle.setAttribute("cx", anchor.x.toString());
    circle.setAttribute("cy", anchor.y.toString());
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "none");
    circle.classList.add("debug");
    circle.classList.add(props.css ?? "");
    return circle;
  });
};

const createCurveData = (props: CurveProps): Partial<PathData> => {
  const { mouseData, curveFunctions } = props.nodeflowData;

  if (mouseData.heldConnectors.length !== 1) {
    return {
      start: undefined,
      end: undefined,
      anchorStart: undefined,
      anchorEnd: undefined,
    };
  }

  const output = mouseData.heldConnectors[0];
  const node = output.parentNode;

  const start = output.getCenter();
  const end = mouseData.globalMousePosition();

  const { anchorStart, anchorEnd } = curveFunctions.calculateCurveAnchors(
    start,
    end,
    node.getCenter(),
    end,
  );

  return {
    start,
    end,
    anchorStart,
    anchorEnd,
    path: curveFunctions.createDefaultCurvePath(
      start,
      end,
      anchorStart,
      anchorEnd,
    ),
  };
};

const createCurve = (props: CurveProps) => {
  const curveData = createCurveData(props);

  const svg = document.createElement("svg") as unknown as SVGSVGElement;
  svg.style.zIndex = "2";
  svg.style.position = "absolute";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  const path = document.createElement("path") as unknown as SVGPathElement;
  // TODO: REACTIVITY
  // curveData.path?.subscribe((curvePath) => {
  //   if (!curvePath) {
  //     return;
  //   }
  //
  //   path.setAttribute("d", curvePath);
  // });

  path.setAttribute("stroke", "black");
  path.setAttribute("stroke-width", "1");
  path.setAttribute("fill", "transparent");
  path.classList.add(props.css ?? "");

  svg.appendChild(path);

  const circles = createDebugCircles(props, curveData);
  circles.forEach((circle) => svg.appendChild(circle));

  // TODO: REACTIVITY
  // props.nodeflowData.settings.debugMode.subscribe((debugMode) => {
  //   if (debugMode) {
  //     document
  //       .querySelectorAll(".debug")
  //       .forEach((el) => el.removeAttribute("hidden"));
  //   } else {
  //     document
  //       .querySelectorAll(".debug")
  //       .forEach((el) => el.setAttribute("hidden", ""));
  //   }
  // });
};

export default createCurve;
