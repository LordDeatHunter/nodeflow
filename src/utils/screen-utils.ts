import Vec2 from "./data/Vec2";

let windowSize = Vec2.of(window.innerWidth, window.innerHeight);

window.addEventListener(
  "resize",
  () => (windowSize = Vec2.of(window.innerWidth, window.innerHeight)),
);

/**
 * Returns the current window size.
 *
 * @returns - The current window size as a Vec2 object.
 */
const getWindowSize = () => windowSize;
const onWindowResize = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => {
    window.removeEventListener("resize", callback);
  };
};

export { getWindowSize, onWindowResize };
