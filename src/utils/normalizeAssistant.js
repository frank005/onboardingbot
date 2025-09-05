// Helper for normalizing assistant messages and extracting field updates
// eslint-disable-next-line no-useless-escape
const TAG_RE = /^\s*\[\[field:(name|birthday|interests|bio|experience)\s+value:([^\]]+)\]\]\s*/i;
const BRACKET_RE = /^\s*\[([^\[\]]+)\]\s*/;

export function normalizeAssistant(raw) {
  let text = String(raw || "");
  let fieldUpdate = null;

  // Extract field marker if present
  const mt = TAG_RE.exec(text);
  if (mt) {
    fieldUpdate = { field: mt[1].toLowerCase(), value: mt[2].trim() };
    text = text.slice(mt[0].length);
  }

  // Remove bracket value if present
  const bv = BRACKET_RE.exec(text);
  if (bv) {
    text = text.slice(bv[0].length);
  }

  return { 
    visibleText: text.trim(), 
    fieldUpdate 
  };
}
