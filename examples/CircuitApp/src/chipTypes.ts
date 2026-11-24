import { generateId, type NodeTemplate } from "@nodeflow-lib/vue";
import { getMainCanvas, markCircuitDirty } from "./state";
import { normalizeTemplate } from "./circuit";

/**
 * Renames chip type `templateId`. Instances on the canvas that still carry
 * the type's old name follow it; ones renamed by hand keep their name.
 */
export const renameChipType = (templateId: string, rawName: string) => {
  const template = getMainCanvas().templates.get(templateId);
  const name = rawName.trim();
  if (!template || !name || name === template.name) return;

  const oldName = template.name;
  getMainCanvas().templates.add({
    ...template,
    name,
    node: {
      ...template.node,
      customData: {
        ...(template.node.customData ?? { type: "chip" }),
        name,
      },
    },
  });

  getMainCanvas().nodes.forEach((node) => {
    if (
      node.customData.templateId === templateId &&
      node.customData.name === oldName
    ) {
      node.customData = { ...node.customData, name };
    }
  });
  markCircuitDirty();
};

// ─── Export / import ─────────────────────────────────────────────────────────

const EXPORT_KIND = "nodeflow-circuit/chip-types";
const EXPORT_VERSION = 1;

interface ExportBundle {
  kind: typeof EXPORT_KIND;
  version: number;
  types: Array<NodeTemplate>;
}

/** Base64 of UTF-8 text (`btoa` alone only takes Latin-1, e.g. not "√"). */
const toBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  // In chunks, so long strings don't overflow the argument list.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const fromBase64 = (base64: string): string => {
  const binary = atob(base64.replace(/\s+/g, ""));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  );
};

/** Chip types `templateIds` (all of them by default) as one base64 string. */
export const exportChipTypes = (templateIds?: Array<string>): string => {
  const types = getMainCanvas().templates
    .toJSON()
    .filter((template) => !templateIds || templateIds.includes(template.id));
  const bundle: ExportBundle = {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    types,
  };
  return toBase64(JSON.stringify(bundle));
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isTemplate = (value: unknown): value is NodeTemplate => {
  if (!isObject(value) || !isObject(value.definition)) return false;
  const { definition } = value;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isObject(value.node) &&
    isObject(definition.nodes) &&
    Array.isArray(definition.connections) &&
    Array.isArray(definition.inputs) &&
    Array.isArray(definition.outputs)
  );
};

export interface ImportResult {
  added: Array<NodeTemplate>;
  /** Types that were already saved, unchanged. */
  skipped: number;
}

/**
 * Adds the chip types in an `exportChipTypes` string. A type whose id is
 * taken by a different type gets a new id, so nothing is overwritten.
 * Throws an Error with a readable message when the string is not an export.
 */
export const importChipTypes = (text: string): ImportResult => {
  let bundle: unknown;
  try {
    bundle = JSON.parse(fromBase64(text.trim()));
  } catch {
    throw new Error("That isn't a valid export string.");
  }
  if (
    !isObject(bundle) ||
    bundle.kind !== EXPORT_KIND ||
    !Array.isArray(bundle.types)
  ) {
    throw new Error("That string isn't an export of chip types.");
  }
  if (typeof bundle.version !== "number" || bundle.version > EXPORT_VERSION) {
    throw new Error("That export comes from a newer version of this app.");
  }

  const types = bundle.types.filter(isTemplate);
  if (types.length === 0) {
    throw new Error("That export doesn't contain any chip types.");
  }

  const existing = new Map(
    getMainCanvas().templates.toJSON().map((template) => [template.id, template]),
  );
  const added: Array<NodeTemplate> = [];
  let skipped = 0;

  types.map(normalizeTemplate).forEach((template) => {
    const current = existing.get(template.id);
    if (current && JSON.stringify(current) === JSON.stringify(template)) {
      skipped++;
      return;
    }
    const id = current ? generateId() : template.id;
    added.push({
      ...template,
      id,
      node: {
        ...template.node,
        customData: {
          ...(template.node.customData ?? { type: "chip" }),
          name: template.name,
          templateId: id,
        },
      },
    });
  });

  if (added.length > 0) getMainCanvas().templates.load(added);
  markCircuitDirty();
  return { added, skipped };
};
