import type { PickerMode } from "../shared/types";
import { copyText, escapeHtml, snapshotFor } from "./inspector";
import {
  isOverlayEvent,
  mountOverlay,
  positionHighlight,
  positionTooltip,
  removeOverlay,
  showToast,
} from "./overlay";
import { renderPanel } from "./panel";

const HOST_ID = "__dompilot_host";

type Session = {
  mode: PickerMode;
  hovered: Element | null;
  selected: Element | null;
};

let session: Session | null = null;
let lastTarget: Element | null = null;

export function setLastTarget(el: Element): void {
  lastTarget = el;
}

export function getLastTarget(): Element | null {
  if (!lastTarget || !lastTarget.isConnected) return null;
  return lastTarget;
}

function elementFromPoint(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    if (node.id === HOST_ID) continue;
    if (node instanceof Element) return node;
  }
  return null;
}

function tooltipHtml(el: Element): string {
  const snap = snapshotFor(el);
  const id = snap.id ? `#${snap.id}` : "";
  const cls = snap.classes.length ? `.${snap.classes.slice(0, 3).join(".")}` : "";
  return `<span class="tag">${escapeHtml(snap.tagName.toLowerCase())}${escapeHtml(id)}</span>
    <span class="meta"> ${escapeHtml(cls)} · ${snap.width}×${snap.height}</span>`;
}

function selectElement(el: Element): void {
  if (!session) return;
  lastTarget = el;
  session.selected = el;
  session.hovered = el;
  const overlay = mountOverlay();
  overlay.tooltip.style.display = "none";
  positionHighlight(el, overlay.highlight);
  renderPanel(overlay, el, stopPicker, selectElement);
}

function onMove(event: MouseEvent): void {
  if (!session || session.selected) return;
  if (isOverlayEvent(event)) return;
  const el = elementFromPoint(event.clientX, event.clientY);
  if (!el || el === session.hovered) return;
  session.hovered = el;
  const overlay = mountOverlay();
  positionHighlight(el, overlay.highlight);
  positionTooltip(el, overlay.tooltip, tooltipHtml(el));
}

async function onClick(event: MouseEvent): Promise<void> {
  if (!session) return;
  if (isOverlayEvent(event)) return;
  const el = elementFromPoint(event.clientX, event.clientY);
  if (!el) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  lastTarget = el;
  session.hovered = el;

  if (session.mode === "copy-selector") {
    await copyText(snapshotFor(el).selector);
    stopPicker();
    showToast("✓ CSS selector copied");
    return;
  }
  if (session.mode === "copy-xpath") {
    await copyText(snapshotFor(el).xpath);
    stopPicker();
    showToast("✓ XPath copied");
    return;
  }

  selectElement(el);
}

function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    stopPicker();
  }
}

function onScroll(): void {
  if (!session) return;
  const el = session.selected ?? session.hovered;
  if (!el) return;
  const overlay = mountOverlay();
  positionHighlight(el, overlay.highlight);
  if (!session.selected) {
    positionTooltip(el, overlay.tooltip, tooltipHtml(el));
  }
}

export function startPicker(mode: PickerMode): void {
  stopPicker();
  session = { mode, hovered: null, selected: null };
  mountOverlay();
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll, true);
}

export function inspectElement(el: Element): void {
  lastTarget = el;
  startPicker("inspect");
  selectElement(el);
}

export function stopPicker(): void {
  document.removeEventListener("mousemove", onMove, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKey, true);
  window.removeEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onScroll, true);
  session = null;
  removeOverlay();
}

export function getLastSnapshot() {
  const el = getLastTarget();
  return el ? snapshotFor(el) : null;
}
