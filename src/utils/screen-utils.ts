import Vec2 from "./data/Vec2";

let windowSize = Vec2.of(window.innerWidth, window.innerHeight);

/**
 * Returns the current window size.
 *
 * @returns - The current window size as a Vec2 object.
 */
const getWindowSize = () => windowSize;
const onWindowResize = (callback: (size: Vec2) => void) => {
  const func = () => {
    windowSize = Vec2.of(window.innerWidth, window.innerHeight);
    callback(windowSize);
  };
  window.addEventListener("resize", func);
  return () => {
    window.removeEventListener("resize", func);
  };
};

export { getWindowSize, onWindowResize };
