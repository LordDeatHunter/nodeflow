/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/MouseEvent/buttons) */
export const MOUSE_BUTTONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
  BACK: 3,
  FORWARD: 4,
} as const;

/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key) */
export const KEYBOARD_KEY_CODES = {
  ALT_LEFT: "AltLeft",
  ALT_RIGHT: "AltRight",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ARROW_UP: "ArrowUp",
  BACKQUOTE: "Backquote",
  BACKSLASH: "Backslash",
  BACKSPACE: "Backspace",
  BRACKET_LEFT: "BracketLeft",
  BRACKET_RIGHT: "BracketRight",
  CAPS_LOCK: "CapsLock",
  COMMA: "Comma",
  CONTEXT_MENU: "ContextMenu",
  CONTROL_LEFT: "ControlLeft",
  CONTROL_RIGHT: "ControlRight",
  DELETE: "Delete",
  DIGIT_0: "Digit0",
  DIGIT_1: "Digit1",
  DIGIT_2: "Digit2",
  DIGIT_3: "Digit3",
  DIGIT_4: "Digit4",
  DIGIT_5: "Digit5",
  DIGIT_6: "Digit6",
  DIGIT_7: "Digit7",
  DIGIT_8: "Digit8",
  DIGIT_9: "Digit9",
  END: "End",
  ENTER: "Enter",
  EQUAL: "Equal",
  ESCAPE: "Escape",
  F1: "F1",
  F10: "F10",
  F11: "F11",
  F12: "F12",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  HOME: "Home",
  INSERT: "Insert",
  KEY_A: "KeyA",
  KEY_B: "KeyB",
  KEY_C: "KeyC",
  KEY_D: "KeyD",
  KEY_E: "KeyE",
  KEY_F: "KeyF",
  KEY_G: "KeyG",
  KEY_H: "KeyH",
  KEY_I: "KeyI",
  KEY_J: "KeyJ",
  KEY_K: "KeyK",
  KEY_L: "KeyL",
  KEY_M: "KeyM",
  KEY_N: "KeyN",
  KEY_O: "KeyO",
  KEY_P: "KeyP",
  KEY_Q: "KeyQ",
  KEY_R: "KeyR",
  KEY_S: "KeyS",
  KEY_T: "KeyT",
  KEY_U: "KeyU",
  KEY_V: "KeyV",
  KEY_W: "KeyW",
  KEY_X: "KeyX",
  KEY_Y: "KeyY",
  KEY_Z: "KeyZ",
  META_LEFT: "MetaLeft",
  META_RIGHT: "MetaRight",
  MINUS: "Minus",
  NUMPAD_0: "Numpad0",
  NUMPAD_1: "Numpad1",
  NUMPAD_2: "Numpad2",
  NUMPAD_3: "Numpad3",
  NUMPAD_4: "Numpad4",
  NUMPAD_5: "Numpad5",
  NUMPAD_6: "Numpad6",
  NUMPAD_7: "Numpad7",
  NUMPAD_8: "Numpad8",
  NUMPAD_9: "Numpad9",
  NUMPAD_ADD: "NumpadAdd",
  NUMPAD_COMMA: "NumpadComma",
  NUMPAD_DECIMAL: "NumpadDecimal",
  NUMPAD_DIVIDE: "NumpadDivide",
  NUMPAD_ENTER: "NumpadEnter",
  NUMPAD_EQUAL: "NumpadEqual",
  NUMPAD_MULTIPLY: "NumpadMultiply",
  NUMPAD_SUBTRACT: "NumpadSubtract",
  NUM_LOCK: "NumLock",
  PAGE_DOWN: "PageDown",
  PAGE_UP: "PageUp",
  PERIOD: "Period",
  QUOTE: "Quote",
  SCROLL_LOCK: "ScrollLock",
  SEMICOLON: "Semicolon",
  SHIFT_LEFT: "ShiftLeft",
  SHIFT_RIGHT: "ShiftRight",
  SLASH: "Slash",
  SPACE: "Space",
  TAB: "Tab",
} as const;
export type KeyboardKeyCode =
  (typeof KEYBOARD_KEY_CODES)[keyof typeof KEYBOARD_KEY_CODES];
