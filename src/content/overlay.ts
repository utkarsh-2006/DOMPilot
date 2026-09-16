const HOST_ID = "__dompilot_host";

export type OverlayEls = {
  host: HTMLElement;
  shadow: ShadowRoot;
  highlight: HTMLElement;
  tooltip: HTMLElement;
  panel: HTMLElement;
  toast: HTMLElement;
};

export function getOverlay(): OverlayEls | null {
  const existing = document.getElementById(HOST_ID);
  if (!existing?.shadowRoot) return null;
  const shadow = existing.shadowRoot;
  return {
    host: existing,
    shadow,
    highlight: shadow.getElementById("highlight") as HTMLElement,
    tooltip: shadow.getElementById("tooltip") as HTMLElement,
    panel: shadow.getElementById("panel") as HTMLElement,
    toast: shadow.getElementById("toast") as HTMLElement,
  };
}

export function mountOverlay(): OverlayEls {
  const current = getOverlay();
  if (current) return current;

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-dompilot", "true");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483646";
  host.style.pointerEvents = "none";
  host.style.inset = "0";

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      #highlight {
        position: fixed;
        pointer-events: none;
        border: 1px solid #5eb1ff;
        background: rgba(94, 177, 255, 0.14);
        outline: 1px solid rgba(0, 0, 0, 0.45);
        display: none;
      }
      #tooltip, #toast, #panel {
        font-family: ui-sans-serif, system-ui, Segoe UI, sans-serif;
        color: #e8eaed;
      }
      #tooltip {
        position: fixed;
        display: none;
        pointer-events: none;
        background: #111318;
        border: 1px solid #2a2f3a;
        padding: 4px 7px;
        font-size: 11px;
        line-height: 1.35;
        max-width: 320px;
        z-index: 2;
      }
      #tooltip .tag { color: #5eb1ff; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
      #tooltip .meta { color: #9aa3b2; }
      #toast {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: #111318;
        border: 1px solid #2f6f4a;
        color: #b6f0c8;
        padding: 6px 10px;
        font-size: 12px;
        display: none;
        z-index: 4;
        pointer-events: none;
      }
      #panel {
        position: fixed;
        right: 12px;
        bottom: 12px;
        width: 340px;
        max-height: min(78vh, 560px);
        background: #0f1218;
        border: 1px solid #2a2f3a;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        display: none;
        pointer-events: auto;
        z-index: 3;
        overflow: hidden;
      }
      #panel header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-bottom: 1px solid #2a2f3a;
        font-size: 12px;
      }
      #panel header strong { font-weight: 650; letter-spacing: 0.01em; }
      .panel-scroll {
        max-height: calc(min(78vh, 560px) - 36px);
        overflow: auto;
      }
      button {
        appearance: none;
        background: #1a2030;
        color: #d7dce5;
        border: 1px solid #323846;
        font: inherit;
        font-size: 11px;
        padding: 3px 7px;
        cursor: pointer;
      }
      button:hover { border-color: #5eb1ff; color: #fff; }
      button.close {
        width: 22px;
        height: 22px;
        padding: 0;
        line-height: 1;
        font-size: 16px;
      }
      .block {
        padding: 8px 10px;
        border-bottom: 1px solid #1c212b;
      }
      .label {
        color: #8b93a2;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .value {
        font-size: 12px;
        word-break: break-word;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 11px;
        color: #d2d8e2;
        overflow-wrap: anywhere;
      }
      .element-title { font-size: 13px; color: #5eb1ff; }
      .sub { margin-top: 2px; color: #9aa3b2; }
      .selector-block {
        margin-top: 6px;
        padding: 6px;
        background: #121722;
        border: 1px solid #1f2531;
      }
      .selector-label {
        color: #8b93a2;
        font-size: 10px;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      .selector-block button { margin-top: 6px; }
      .actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      .actions button { flex: 1; padding: 6px 8px; }
      .section {
        border-bottom: 1px solid #1c212b;
      }
      .section summary {
        list-style: none;
        cursor: pointer;
        padding: 8px 10px;
        color: #8b93a2;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        user-select: none;
      }
      .section summary::-webkit-details-marker { display: none; }
      .section summary::after {
        content: "▶";
        float: right;
        color: #6d7482;
        font-size: 9px;
      }
      .section[open] summary::after { content: "▼"; }
      .section-body { padding: 0 10px 8px; }
      .muted { color: #6d7482; font-size: 11px; margin: 0; }
      .attr-row { margin-bottom: 6px; }
      .attr-name { color: #8b93a2; font-size: 10px; text-transform: lowercase; }
      .attr-value { font-size: 11px; word-break: break-word; }
      .style-group { margin-bottom: 8px; }
      .style-group-name {
        color: #8b93a2;
        font-size: 10px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .style-row {
        display: grid;
        grid-template-columns: 92px 1fr;
        gap: 6px;
        font-size: 11px;
        margin-bottom: 3px;
      }
      .style-value { word-break: break-word; color: #d2d8e2; }
      .crumb-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
      }
      .crumb {
        padding: 2px 6px;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 10px;
      }
      .crumb-sep { color: #6d7482; font-size: 10px; }
    </style>
    <div id="highlight"></div>
    <div id="tooltip"></div>
    <div id="panel"></div>
    <div id="toast"></div>
  `;

  document.documentElement.appendChild(host);
  return {
    host,
    shadow,
    highlight: shadow.getElementById("highlight") as HTMLElement,
    tooltip: shadow.getElementById("tooltip") as HTMLElement,
    panel: shadow.getElementById("panel") as HTMLElement,
    toast: shadow.getElementById("toast") as HTMLElement,
  };
}

export function removeOverlay(): void {
  document.getElementById(HOST_ID)?.remove();
}

export function isOverlayEvent(event: Event): boolean {
  const path = event.composedPath();
  return path.some((node) => node instanceof Element && node.id === HOST_ID);
}

export function positionHighlight(el: Element, box: HTMLElement): void {
  const rect = el.getBoundingClientRect();
  box.style.display = "block";
  box.style.top = `${rect.top}px`;
  box.style.left = `${rect.left}px`;
  box.style.width = `${Math.max(rect.width, 1)}px`;
  box.style.height = `${Math.max(rect.height, 1)}px`;
}

export function positionTooltip(
  el: Element,
  tooltip: HTMLElement,
  html: string,
): void {
  const rect = el.getBoundingClientRect();
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  const top = rect.top > 36 ? rect.top - 30 : rect.bottom + 6;
  let left = rect.left;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  const tipRect = tooltip.getBoundingClientRect();
  if (tipRect.right > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - tipRect.width - 8);
    tooltip.style.left = `${left}px`;
  }
}

let toastTimer = 0;

export function showToast(message: string): void {
  const overlay = mountOverlay();
  overlay.toast.textContent = message;
  overlay.toast.style.display = "block";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    overlay.toast.style.display = "none";
    const busy =
      overlay.panel.style.display === "block" || overlay.highlight.style.display === "block";
    if (!busy) removeOverlay();
  }, 1600);
}
