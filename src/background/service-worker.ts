import { sendToTab } from "../shared/bridge";
import type { RuntimeMessage } from "../shared/types";

const MENU = {
  root: "dompilot",
  selector: "dompilot-copy-selector",
  xpath: "dompilot-copy-xpath",
  inspect: "dompilot-inspect",
} as const;

function createMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU.root,
      title: "DOMPilot",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: MENU.selector,
      parentId: MENU.root,
      title: "Copy CSS Selector",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: MENU.xpath,
      parentId: MENU.root,
      title: "Copy XPath",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: MENU.inspect,
      parentId: MENU.root,
      title: "Inspect Element",
      contexts: ["all"],
    });
  });
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

function messageForMenu(id: string): RuntimeMessage | null {
  if (id === MENU.selector) return { type: "COPY_SELECTOR" };
  if (id === MENU.xpath) return { type: "COPY_XPATH" };
  if (id === MENU.inspect) return { type: "INSPECT_LAST" };
  return null;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id == null) return;
  const message = messageForMenu(String(info.menuItemId));
  if (!message) return;
  void sendToTab(tab.id, message);
});
