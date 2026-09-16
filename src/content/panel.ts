import type { Snapshot } from "../shared/types";
import {
  copyText,
  domPathElements,
  escapeHtml,
  snapshotFor,
} from "./inspector";
import { showToast, type OverlayEls } from "./overlay";

function section(title: string, body: string, open = true): string {
  return `
    <details class="section" ${open ? "open" : ""}>
      <summary>${escapeHtml(title)}</summary>
      <div class="section-body">${body}</div>
    </details>
  `;
}

function renderAttributes(snapshot: Snapshot): string {
  if (!snapshot.attributes.length) {
    return `<p class="muted">No useful attributes.</p>`;
  }
  return snapshot.attributes
    .map(
      (attr) => `
        <div class="attr-row">
          <div class="attr-name mono">${escapeHtml(attr.name)}</div>
          <div class="attr-value">${escapeHtml(attr.value)}</div>
        </div>
      `,
    )
    .join("");
}

function renderStyles(snapshot: Snapshot): string {
  if (!snapshot.styles.length) {
    return `<p class="muted">No computed styles available.</p>`;
  }
  return snapshot.styles
    .map(
      (group) => `
        <div class="style-group">
          <div class="style-group-name">${escapeHtml(group.name)}</div>
          ${group.items
            .map(
              (item) => `
                <div class="style-row">
                  <span class="mono">${escapeHtml(item.property)}</span>
                  <span class="style-value">${escapeHtml(item.value)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      `,
    )
    .join("");
}

function renderBreadcrumb(snapshot: Snapshot): string {
  if (!snapshot.breadcrumb.length) {
    return `<p class="muted">No DOM path available.</p>`;
  }
  return `
    <div class="crumb-row">
      ${snapshot.breadcrumb
        .map(
          (item, index) => `
            <button type="button" class="crumb" data-crumb="${index}">${escapeHtml(item.label)}</button>
          `,
        )
        .join('<span class="crumb-sep">›</span>')}
    </div>
  `;
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
        js: { value: snap.jsSelector, label: "JavaScript selector copied" },
        html: { value: selected.outerHTML, label: "HTML copied" },
        text: { value: snap.text, label: "Text copied" },
        attributes: {
          value: snap.attributes.map((attr) => `${attr.name}=${attr.value}`).join("\n"),
          label: "Attributes copied",
        },
      };
      const item = map[key];
      if (!item?.value) return;
      await copyText(item.value);
      showToast(`✓ ${item.label}`);
    });
  });
}

function bindBreadcrumb(
  root: HTMLElement,
  selected: Element,
  onSelect: (el: Element) => void,
): void {
  const chain = domPathElements(selected);
  root.querySelectorAll<HTMLButtonElement>("[data-crumb]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = Number(button.dataset.crumb);
      const target = chain[index];
      if (!target) return;
      onSelect(target);
    });
  });
}

export function renderPanel(
  overlay: OverlayEls,
  el: Element,
  onClose: () => void,
  onReselect: (el: Element) => void,
): void {
  const snap = snapshotFor(el);
  overlay.panel.style.display = "block";
  overlay.panel.innerHTML = `
    <header>
      <strong>DOMPilot</strong>
      <button type="button" class="close" data-close aria-label="Close">×</button>
    </header>
    <div class="panel-scroll">
      <div class="block">
        <div class="label">Element</div>
        <div class="value mono element-title">${escapeHtml(snap.tagName)}</div>
        ${
          snap.id || snap.classes.length
            ? `<div class="value mono sub">${escapeHtml(
                [snap.id ? `#${snap.id}` : "", snap.classes.length ? `.${snap.classes.join(".")}` : ""]
                  .filter(Boolean)
                  .join(" "),
              )}</div>`
            : ""
        }
      </div>

      <div class="block">
        <div class="label">Content</div>
        <div class="value">${snap.text ? escapeHtml(snap.text) : "—"}</div>
      </div>

      <div class="block">
        <div class="label">Size</div>
        <div class="value mono">${snap.width} × ${snap.height}</div>
      </div>

      <div class="block">
        <div class="label">Selectors</div>
        <div class="selector-block">
          <div class="selector-label">CSS</div>
          <div class="value mono">${escapeHtml(snap.selector)}</div>
          <button type="button" data-copy="selector">Copy CSS</button>
        </div>
        <div class="selector-block">
          <div class="selector-label">XPath</div>
          <div class="value mono">${escapeHtml(snap.xpath)}</div>
          <button type="button" data-copy="xpath">Copy XPath</button>
        </div>
        <div class="actions">
          <button type="button" data-copy="js">Copy JS</button>
          <button type="button" data-copy="html">Copy HTML</button>
        </div>
      </div>

      ${section("Styles", renderStyles(snap), false)}
      ${section("Attributes", renderAttributes(snap), false)}
      ${section("DOM Path", renderBreadcrumb(snap), false)}
    </div>
  `;

  overlay.panel.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  });

  bindCopy(overlay.panel, el);
  bindBreadcrumb(overlay.panel, el, onReselect);
}
