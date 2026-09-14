const UNSTABLE_CLASS =
  /^(css-|sc-|s-|_|is-animat)|^[a-z]{1,3}-[a-f0-9]{5,}$|[a-f0-9]{8,}|^svelte-|^emotion-|^jsx-/i;

function uniqueMatches(root: ParentNode, selector: string, el: Element): boolean {
  try {
    const found = root.querySelectorAll(selector);
    return found.length === 1 && found[0] === el;
  } catch {
    return false;
  }
}

function isUniqueOnPage(selector: string, el: Element): boolean {
  return uniqueMatches(el.ownerDocument, selector, el);
}

function stableClasses(el: Element): string[] {
  return [...el.classList].filter((name) => {
    if (!name) return false;
    if (name.length > 48) return false;
    if (UNSTABLE_CLASS.test(name)) return false;
    return true;
  });
}

function tag(el: Element): string {
  return el.localName || el.tagName.toLowerCase();
}

function cssId(el: Element): string | null {
  const id = el.getAttribute("id");
  if (!id) return null;
  const selector = `#${CSS.escape(id)}`;
  return isUniqueOnPage(selector, el) ? selector : null;
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

function attrSelector(el: Element): string | null {
  const t = tag(el);
  for (const name of ATTR_CANDIDATES) {
    const value = el.getAttribute(name);
    if (!value || value.length > 80) continue;
    const selector = `${t}[${name}="${cssAttrValue(value)}"]`;
    if (isUniqueOnPage(selector, el)) return selector;
  }
  return null;
}

function cssAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function classSelector(el: Element): string | null {
  const classes = stableClasses(el);
  if (!classes.length) return null;
  const t = tag(el);
  for (let i = classes.length; i >= 1; i--) {
    const selector = `${t}.${classes.slice(0, i).map(CSS.escape).join(".")}`;
    if (isUniqueOnPage(selector, el)) return selector;
  }
  return null;
}

function nthOfType(el: Element): string {
  const parent = el.parentElement;
  const t = tag(el);
  if (!parent) return t;
  const same = [...parent.children].filter((child) => tag(child) === t);
  if (same.length === 1) return t;
  return `${t}:nth-of-type(${same.indexOf(el) + 1})`;
}

function structuralSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === 1) {
    const id = cssId(current);
    if (id) {
      parts.unshift(id);
      break;
    }

    const uniqueClass = classSelector(current);
    if (uniqueClass && current !== el) {
      parts.unshift(uniqueClass);
      break;
    }

    parts.unshift(nthOfType(current));
    if (tag(current) === "html") break;
    current = current.parentElement;
  }

  return parts.join(" > ");
}

export function cssSelector(el: Element): string {
  const byId = cssId(el);
  if (byId) return byId;

  const byAttr = attrSelector(el);
  if (byAttr) return byAttr;

  const byClass = classSelector(el);
  if (byClass) return byClass;

  return structuralSelector(el);
}
