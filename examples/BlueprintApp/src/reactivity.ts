import { createSignal } from "solid-js";

const [revision, setRevision] = createSignal(0);

export const blueprintRevision = revision;

export const markBlueprintDirty = () => setRevision((r) => r + 1);
