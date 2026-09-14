export type PickerMode = "inspect" | "copy-selector" | "copy-xpath";

export type RuntimeMessage =
  | { type: "PING" }
  | { type: "START_PICKER"; mode: PickerMode }
  | { type: "STOP_PICKER" }
  | { type: "COPY_SELECTOR" }
  | { type: "COPY_XPATH" }
  | { type: "INSPECT_LAST" }
  | { type: "GET_SNAPSHOT" };

export type Snapshot = {
  tagName: string;
  id: string;
  classes: string[];
  text: string;
  width: number;
  height: number;
  selector: string;
  xpath: string;
  html: string;
};

export type MessageResponse =
  | { ok: true; copied?: string; snapshot?: Snapshot | null }
  | { ok: false; error: string };
