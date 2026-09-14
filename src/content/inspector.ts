import type { Snapshot } from "../shared/types";
import { cssSelector } from "./selector";
import { xpathFor } from "./xpath";

function visibleText(el: Element): string {
  const raw = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (raw.length <= 120) return raw;
  return `${raw.slice(0, 117)}...`;
}

export function snapshotFor(el: Element): Snapshot {
  const rect = el.getBoundingClientRect();
  return {
    tagName: (el.localName || el.tagName).toUpperCase(),
    id: el.getAttribute("id") ?? "",
    classes: [...el.classList],
    text: visibleText(el),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    selector: cssSelector(el),
    xpath: xpathFor(el),
    html: el.outerHTML,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}
