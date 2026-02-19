/**
 * HTML sanitization utilities for OzMos.
 * Prevents XSS when interpolating data into innerHTML.
 */

/**
 * Escape a plain string for safe embedding in HTML.
 * Uses DOM textContent trick for correctness across all characters.
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str == null) return '';
  const el = document.createElement('span');
  el.textContent = String(str);
  return el.innerHTML;
}

// Tags whose element node is kept (children retained)
const ALLOWED_TAGS = new Set(['b', 'i', 'strong', 'em', 'br', 'a']);
// Attributes allowed to pass through
const ALLOWED_ATTRS = new Set(['href', 'target', 'rel']);

/**
 * Sanitize an HTML string, keeping only safe tags and attributes.
 * Allowlist: <b>, <i>, <strong>, <em>, <br>, <a href rel target>.
 * Any other element is unwrapped (children kept, tag removed).
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHTML(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const tag = node.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed element with its children (unwrap)
      const parent = node.parentNode;
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      parent.removeChild(node);
      return;
    }

    // Strip disallowed attributes
    for (const attr of [...node.attributes]) {
      if (!ALLOWED_ATTRS.has(attr.name)) {
        node.removeAttribute(attr.name);
      } else if (attr.name === 'href') {
        const v = attr.value.trim().toLowerCase();
        if (!/^(https?:|#|mailto:)/.test(v)) {
          node.removeAttribute('href');
        }
      }
    }

    // Force safe link attributes
    if (tag === 'a') {
      node.setAttribute('rel', 'noopener noreferrer');
      if (!node.hasAttribute('target')) node.setAttribute('target', '_blank');
    }

    [...node.childNodes].forEach(cleanNode);
  }

  [...tmp.childNodes].forEach(cleanNode);
  return tmp.innerHTML;
}
