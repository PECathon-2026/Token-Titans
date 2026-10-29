// Browser-only content processing; call after hydration.

/** Icons and arrows in an article are meant to sit inline with text at this size. */
const ICON_PX = 20;

export function webUrl(value: string, base: string): string {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Visible text length of an HTML string — used to pick the fuller article body. */
export function textLength(html: string | null | undefined): number {
  if (!html) return 0;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim().length;
}

export async function sanitizeContent(html: string, base: string) {
  const DOMPurify = (await import("dompurify")).default;
  const options = {
    FORBID_TAGS: ["style", "form", "input", "iframe", "object", "embed", "applet"],
    FORBID_ATTR: ["style"],
    ADD_ATTR: ["target", "referrerpolicy"],
  };
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(html, options), "text/html");
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = webUrl(a.getAttribute("href") ?? "", base);
    if (href) {
      a.setAttribute("href", href);
      // External sites refuse to load inside the app frame, so open them in a new tab.
      a.setAttribute("target", "_blank");
    } else {
      a.removeAttribute("href");
      a.removeAttribute("target");
    }
    a.setAttribute("rel", "noopener noreferrer");
  });
  doc.querySelectorAll("img").forEach((img) => {
    const lazy = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || "";
    const src = webUrl(img.getAttribute("src") || lazy, base);
    if (!src) {
      img.remove();
      return;
    }
    img.setAttribute("src", src);
    img.removeAttribute("srcset");
    img.setAttribute("loading", "lazy");
    // Many blogs block hotlinked images when a referrer is sent.
    img.setAttribute("referrerpolicy", "no-referrer");
  });
  // Icons and arrows shipped without a size would fill the whole column, so pin them to text size.
  doc.querySelectorAll("svg").forEach((svg) => {
    if (svg.hasAttribute("width") || svg.hasAttribute("height")) return;
    const box = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
    const vw = box[2] ?? 0;
    const vh = box[3] ?? 0;
    const ratio = vw > 0 && vh > 0 ? vw / vh : 1;
    svg.setAttribute("width", String(ratio >= 1 ? ICON_PX : Math.max(1, Math.round(ICON_PX * ratio))));
    svg.setAttribute("height", String(ratio >= 1 ? Math.max(1, Math.round(ICON_PX / ratio)) : ICON_PX));
  });
  return DOMPurify.sanitize(doc.body.innerHTML, options);
}
