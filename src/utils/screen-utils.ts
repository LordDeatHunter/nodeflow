import { Size } from "../types/types";

export const getScreenSize = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
