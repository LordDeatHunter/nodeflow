import { Size } from "../types/types";

export const getScreenSize = (): Size => ({
  height: window.innerHeight,
  width: window.innerWidth,
});
