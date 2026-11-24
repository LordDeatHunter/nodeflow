export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export type ChipTypeDialogState =
  | { kind: "rename"; templateId: string }
  /** Every chip type when `templateIds` is left out. */
  | { kind: "export"; templateIds?: Array<string> }
  | { kind: "import" };
