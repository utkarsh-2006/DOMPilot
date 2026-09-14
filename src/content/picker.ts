import type { PickerMode, Snapshot } from "../shared/types";
import { copyText, escapeHtml, snapshotFor } from "./inspector";
import {
  isOverlayEvent,
  mountOverlay,
  positionHighlight,
  positionTooltip,
  removeOverlay,
  showToast,
  type OverlayEls,
} from "./overlay";

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
    if (node.id === "__devlens_host") continue;
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

function bindCopy(root: HTMLElement, selected: Element): void {
  root.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = button.dataset.copy ?? "";
      const snap = snapshotFor(selected);
      const map: Record<string, { value: string; label: string }> = {
        selector: { value: snap.selector, label: "CSS selector copied" },
        xpath: { value: snap.xpath, label: "XPath copied" },
        id: { value: snap.id, label: "ID copied" },
        classes: { value: snap.classes.join(" "), label: "Classes copied" },
        text: { value: snap.text, label: "Text copied" },
        html: { value: snap.html, label: "HTML copied" },
      };
      const item = map[key];
      if (!item?.value) return;
      await copyText(item.value);
      showToast(`✓ ${item.label}`);
    });
  });
}

function renderPanel(overlay: OverlayEls, el: Element): void {
  const snap = snapshotFor(el);
  overlay.panel.style.display = "block";
  overlay.panel.innerHTML = `
    <header>
      <strong>DevLens</strong>
      <span class="hint">Esc to close</span>
    </header>
    <div class="rows">
      <div class="row">
        <div class="label">Element</div>
        <div class="value mono">${escapeHtml(snap.tagName)}</div>
      </div>
      <div class="row">
        <div class="label">ID ${snap.id ? `<button type="button" data-copy="id">Copy</button>` : ""}</div>
        <div class="value mono">${snap.id ? escapeHtml(snap.id) : "—"}</div>
      </div>
      <div class="row">
        <div class="label">Classes ${snap.classes.length ? `<button type="button" data-copy="classes">Copy</button>` : ""}</div>
        <div class="value mono">${snap.classes.length ? escapeHtml(snap.classes.join(" ")) : "—"}</div>
      </div>
      <div class="row">
        <div class="label">Text ${snap.text ? `<button type="button" data-copy="text">Copy</button>` : ""}</div>
        <div class="value">${snap.text ? escapeHtml(snap.text) : "—"}</div>
      </div>
      <div class="row">
        <div class="label">Size</div>
        <div class="value mono">${snap.width} × ${snap.height}</div>
      </div>
      <div class="row">
        <div class="label">CSS selector <button type="button" data-copy="selector">Copy</button></div>
        <div class="value mono">${escapeHtml(snap.selector)}</div>
      </div>
      <div class="row">
        <div class="label">XPath <button type="button" data-copy="xpath">Copy</button></div>
        <div class="value mono">${escapeHtml(snap.xpath)}</div>
      </div>
    </div>
    <button type="button" class="primary" data-copy="html">Copy HTML</button>
  `;
  bindCopy(overlay.panel, el);
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

  session.selected = el;
  const overlay = mountOverlay();
  overlay.tooltip.style.display = "none";
  positionHighlight(el, overlay.highlight);
  renderPanel(overlay, el);
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
  if (!session) return;
  session.selected = el;
  session.hovered = el;
  const overlay = mountOverlay();
  overlay.tooltip.style.display = "none";
  positionHighlight(el, overlay.highlight);
  renderPanel(overlay, el);
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

export function getLastSnapshot(): Snapshot | null {
  const el = getLastTarget();
  return el ? snapshotFor(el) : null;
}
