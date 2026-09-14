import type { MessageResponse, RuntimeMessage } from "../shared/types";
import { copyText, snapshotFor } from "./inspector";
import { showToast } from "./overlay";
import {
  getLastSnapshot,
  getLastTarget,
  inspectElement,
  setLastTarget,
  startPicker,
  stopPicker,
} from "./picker";

document.addEventListener(
  "contextmenu",
  (event) => {
    if (event.target instanceof Element) {
      setLastTarget(event.target);
    }
  },
  true,
);

async function handle(message: RuntimeMessage): Promise<MessageResponse> {
  if (message.type === "PING") return { ok: true };

  if (message.type === "START_PICKER") {
    startPicker(message.mode);
    return { ok: true };
  }

  if (message.type === "STOP_PICKER") {
    stopPicker();
    return { ok: true };
  }

  if (message.type === "GET_SNAPSHOT") {
    return { ok: true, snapshot: getLastSnapshot() };
  }

  const target = getLastTarget();
  if (!target) {
    return { ok: false, error: "Right-click an element on this page first." };
  }

  if (message.type === "COPY_SELECTOR") {
    const value = snapshotFor(target).selector;
    await copyText(value);
    showToast("✓ CSS selector copied");
    return { ok: true, copied: value };
  }

  if (message.type === "COPY_XPATH") {
    const value = snapshotFor(target).xpath;
    await copyText(value);
    showToast("✓ XPath copied");
    return { ok: true, copied: value };
  }

  if (message.type === "INSPECT_LAST") {
    inspectElement(target);
    return { ok: true, snapshot: snapshotFor(target) };
  }

  return { ok: false, error: "Unknown message." };
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void sender;
  void handle(message).then(sendResponse);
  return true;
});
