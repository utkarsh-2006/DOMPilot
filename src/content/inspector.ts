import type {
  BreadcrumbItem,
  ElementAttribute,
  Snapshot,
  StyleGroup,
} from "../shared/types";
import { cssSelector, jsSelector } from "./selector";
import { xpathFor } from "./xpath";

const PRIORITY_ATTRIBUTES = [
  "id",
  "class",
  "href",
  "src",
  "name",
  "type",
  "role",
  "title",
] as const;

const STYLE_GROUPS: Record<string, string[]> = {
  Layout: ["display", "position", "overflow", "z-index"],
  Size: ["width", "height", "min-width", "max-width", "min-height", "max-height"],
  Spacing: ["margin", "padding", "gap"],
  Typography: ["font-family", "font-size", "font-weight", "line-height", "text-align"],
  Colors: ["color", "background-color"],
  Border: ["border", "border-radius"],
};

const SKIP_ATTRIBUTE_NAMES = new Set([
  "style",
  "tabindex",
  "contenteditable",
  "draggable",
  "spellcheck",
  "hidden",
]);

function tag(el: Element): string {
  return el.localName || el.tagName.toLowerCase();
}

function visibleText(el: Element): string {
  const raw = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (raw.length <= 160) return raw;
  return `${raw.slice(0, 157)}...`;
}

function truncate(value: string, max = 160): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function isUsefulStyleValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !["auto", "none", "normal", "visible", "static", "rgba(0, 0, 0, 0)"].includes(
    trimmed,
  );
}

function collectAttributes(el: Element): ElementAttribute[] {
  const items: ElementAttribute[] = [];
  const seen = new Set<string>();

  for (const name of PRIORITY_ATTRIBUTES) {
    if (name === "class") {
      if (el.classList.length) {
        items.push({ name: "class", value: [...el.classList].join(" ") });
        seen.add("class");
      }
      continue;
    }
    if (name === "id") {
      const id = el.getAttribute("id");
      if (id) {
        items.push({ name: "id", value: id });
        seen.add("id");
      }
      continue;
    }
    const value = el.getAttribute(name);
    if (value) {
      items.push({ name, value: truncate(value) });
      seen.add(name);
    }
  }

  const extras: ElementAttribute[] = [];
  for (const attr of el.attributes) {
    if (seen.has(attr.name) || SKIP_ATTRIBUTE_NAMES.has(attr.name)) continue;
    if (!attr.name.startsWith("aria-") && !attr.name.startsWith("data-")) continue;
    if (!attr.value || attr.value.length > 160) continue;
    extras.push({ name: attr.name, value: truncate(attr.value) });
  }

  extras.sort((a, b) => a.name.localeCompare(b.name));
  return [...items, ...extras].slice(0, 24);
}

function collectStyles(el: Element): StyleGroup[] {
  try {
    const computed = getComputedStyle(el);
    return Object.entries(STYLE_GROUPS)
      .map(([name, properties]) => ({
        name,
        items: properties
          .map((property) => ({
            property,
            value: computed.getPropertyValue(property).trim(),
          }))
          .filter((item) => isUsefulStyleValue(item.value)),
      }))
      .filter((group) => group.items.length > 0);
  } catch {
    return [];
  }
}

function breadcrumbLabel(el: Element): string {
  const id = el.getAttribute("id");
  if (id) return `#${id}`;
  const classes = [...el.classList].slice(0, 2);
  if (classes.length) return `${tag(el)}.${classes.join(".")}`;
  return tag(el);
}

export function domPathElements(el: Element): Element[] {
  const chain: Element[] = [];
  let current: Element | null = el;
  while (current && tag(current) !== "html") {
    chain.unshift(current);
    current = current.parentElement;
  }
  return chain.slice(-10);
}

export function breadcrumbFor(el: Element): BreadcrumbItem[] {
  return domPathElements(el).map((node) => ({ label: breadcrumbLabel(node) }));
}

export function snapshotFor(el: Element): Snapshot {
  const rect = el.getBoundingClientRect();
  const selector = cssSelector(el);
  return {
    tagName: tag(el).toUpperCase(),
    id: el.getAttribute("id") ?? "",
    classes: [...el.classList],
    text: visibleText(el),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    selector,
    xpath: xpathFor(el),
    jsSelector: jsSelector(selector),
    html: el.outerHTML.length > 4000 ? `${el.outerHTML.slice(0, 3997)}...` : el.outerHTML,
    attributes: collectAttributes(el),
    styles: collectStyles(el),
    breadcrumb: breadcrumbFor(el),
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
