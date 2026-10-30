// A document's body is a tree of editor nodes (ProseMirror JSON) that comes from a browser, so it is cleaned before it is saved:
// no embedded frames, scripts or raw HTML, and only links and images that can't run anything.

const BLOCKED_NODES = new Set(["iframe", "htmlBlock", "script", "embed", "video", "rawHTML"]);
const ALIGNMENTS = new Set(["left", "right", "center", "justify"]);
const SIZE = /^\d+(\.\d+)?(%|px|em|rem)?$/;
const IMAGE_DATA = /^data:image\/(png|jpeg|gif|svg\+xml|webp);/;

/** Web addresses, mail links and inline images; anything else (javascript:, file:, other data:) is not a link we keep. */
export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  if (/^https?:\/\//.test(url) || /^mailto:/.test(url)) return true;
  return IMAGE_DATA.test(url);
}

function cleanAttrs(attrs: Record<string, any>) {
  const out = { ...attrs };
  if (out.src && !isSafeUrl(out.src)) delete out.src;
  if (out.href && !isSafeUrl(out.href)) delete out.href;
  if (out.width !== undefined && !SIZE.test(String(out.width))) delete out.width;
  if (out.textAlign !== undefined && !ALIGNMENTS.has(String(out.textAlign))) delete out.textAlign;
  return out;
}

function cleanMarks(marks: any[]) {
  const kept: any[] = [];
  for (const mark of marks) {
    if (!mark || typeof mark !== "object") continue;
    if (mark.type !== "link") {
      kept.push(mark);
    } else if (mark.attrs && isSafeUrl(mark.attrs.href)) {
      kept.push({ ...mark, attrs: { href: String(mark.attrs.href) } }); // a link keeps only its address
    }
  }
  return kept;
}

function cleanNode(node: any): any {
  if (!node || typeof node !== "object") return node;
  if (node.type && BLOCKED_NODES.has(node.type)) return null;

  const out: any = { ...node };
  if (out.attrs && typeof out.attrs === "object") out.attrs = cleanAttrs(out.attrs);
  if (Array.isArray(out.marks)) out.marks = cleanMarks(out.marks);
  if (Array.isArray(out.content)) out.content = out.content.map(cleanNode).filter(Boolean);
  return out;
}

export function sanitizeJSON(node: any): any {
  try {
    return cleanNode(node);
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

export default sanitizeJSON;
