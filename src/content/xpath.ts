function tag(el: Element): string {
  return el.localName || el.tagName.toLowerCase();
}

function xpathStringLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat(${value
    .split("'")
    .map((part) => `'${part}'`)
    .join(`, "'", `)})`;
}

function uniqueIdXPath(el: Element): string | null {
  const id = el.getAttribute("id");
  if (!id) return null;
  const expr = `//*[@id=${xpathStringLiteral(id)}]`;
  return uniqueXPath(el, expr) ? expr : null;
}

function uniqueXPath(el: Element, expr: string): boolean {
  try {
    const result = el.ownerDocument.evaluate(
      expr,
      el.ownerDocument,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );
    return result.snapshotLength === 1 && result.snapshotItem(0) === el;
  } catch {
    return false;
  }
}

const ATTR_CANDIDATES = [
  "data-testid",
  "data-test",
  "data-cy",
  "name",
  "aria-label",
  "placeholder",
  "title",
  "alt",
  "role",
] as const;

function attrXPath(el: Element): string | null {
  const t = tag(el);
  for (const name of ATTR_CANDIDATES) {
    const value = el.getAttribute(name);
    if (!value || value.length > 80) continue;
    const expr = `//${t}[@${name}=${xpathStringLiteral(value)}]`;
    if (uniqueXPath(el, expr)) return expr;
  }
  return null;
}

function nthAmongSiblings(el: Element): number {
  const parent = el.parentElement;
  if (!parent) return 1;
  const t = tag(el);
  let n = 0;
  for (const child of parent.children) {
    if (tag(child) === t) n += 1;
    if (child === el) return n;
  }
  return 1;
}

function structuralXPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === 1) {
    const byId = uniqueIdXPath(current);
    if (byId) {
      const rest = parts.join("/");
      return rest ? `${byId}/${rest}` : byId;
    }

    const t = tag(current);
    const index = nthAmongSiblings(current);
    const parent = current.parentElement;
    const needsIndex = !parent || [...parent.children].filter((c) => tag(c) === t).length > 1;
    parts.unshift(needsIndex ? `${t}[${index}]` : t);

    if (t === "html") break;
    current = current.parentElement;
  }

  return "/" + parts.join("/");
}

export function xpathFor(el: Element): string {
  const byId = uniqueIdXPath(el);
  if (byId) return byId;

  const byAttr = attrXPath(el);
  if (byAttr) return byAttr;

  return structuralXPath(el);
}
