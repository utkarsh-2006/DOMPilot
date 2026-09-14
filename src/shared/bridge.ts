import type { MessageResponse, RuntimeMessage } from "./types";

async function ping(tabId: number): Promise<boolean> {
  try {
    const res = (await chrome.tabs.sendMessage(tabId, { type: "PING" })) as MessageResponse;
    return res?.ok === true;
  } catch {
    return false;
  }
}

async function inject(tabId: number): Promise<void> {
  const files = chrome.runtime.getManifest().content_scripts?.[0]?.js;
  if (!files?.length) {
    throw new Error("Content script is missing from the manifest.");
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files,
  });
}

export async function sendToTab(
  tabId: number,
  message: RuntimeMessage,
  options?: { inject?: boolean },
): Promise<MessageResponse> {
  const shouldInject = options?.inject !== false;
  if (!(await ping(tabId))) {
    if (!shouldInject) {
      return { ok: true, snapshot: null };
    }
    try {
      await inject(tabId);
    } catch {
      return {
        ok: false,
        error: "DevLens cannot run on this page. Open a normal http(s) tab and try again.",
      };
    }
  }

  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as MessageResponse;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      return (await chrome.tabs.sendMessage(tabId, message)) as MessageResponse;
    } catch {
      return {
        ok: false,
        error: "Reload the page, then try again.",
      };
    }
  }
}

export async function sendToActiveTab(
  message: RuntimeMessage,
  options?: { inject?: boolean },
): Promise<MessageResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) {
    return { ok: false, error: "No active tab." };
  }
  return sendToTab(tab.id, message, options);
}
