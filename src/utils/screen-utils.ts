import Vec2 from "./data/Vec2";
import Observable from "./reactive/Observable";

/**
 * A Solid signal that contains the current window size.
 */
export const windowSize = new Observable<Vec2>(
  Vec2.of(window.innerWidth, window.innerHeight),
);

window.addEventListener(
  "resize",
  () => (windowSize.value = Vec2.of(window.innerWidth, window.innerHeight)),
);
