const ALLOWED_TAGS = new Set([
  'p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'blockquote', 'pre', 'code', 'span'
]);
const VOID_TAGS = new Set(['br']);
const HTML_CONTENT_PATTERN = /<(?:p|div|br|h[1-6]|ul|ol|li|strong|b|em|i|u|s|a|blockquote|pre|code|span|font)\b/i;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

export function safeContentUrl(value) {
  try {
    const url = new URL(String(value || ''), document.baseURI);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_match, label, url) => {
      const safe = safeContentUrl(url);
      return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer noopener">${label}</a>` : label;
    });
}

export function markdownToHtml(raw) {
  const lines = String(raw || '').replace(/\r/g, '').split('\n');
  const output = [];
  let listType = '';
  const closeList = () => { if (listType) output.push(`</${listType}>`); listType = ''; };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const number = line.match(/^\s*\d+\.\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (bullet || number) {
      const nextList = bullet ? 'ul' : 'ol';
      if (listType !== nextList) { closeList(); listType = nextList; output.push(`<${listType}>`); }
      output.push(`<li>${inlineMarkdown((bullet || number)[1])}</li>`);
    } else if (/^>\s?/.test(line)) {
      closeList();
      output.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else if (line.trim()) {
      closeList();
      output.push(`<p>${inlineMarkdown(line)}</p>`);
    } else {
      closeList();
    }
  }
  closeList();
  return output.join('');
}

function safeStyle(raw) {
  const allowed = [];
  String(raw || '').split(';').forEach(declaration => {
    const separator = declaration.indexOf(':');
    if (separator < 0) return;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim().replace(/\s+/g, ' ');
    if (!value || /url\s*\(|expression\s*\(|!important|[;{}]/i.test(value)) return;
    if (property === 'text-align' && /^(left|center|right|justify)$/i.test(value)) allowed.push(`${property}:${value}`);
    if (property === 'font-size' && /^(12|14|16|18|20|24|32)px$/i.test(value)) allowed.push(`${property}:${value}`);
    if (property === 'font-family' && /^[a-z0-9 ,"'_-]+$/i.test(value)) allowed.push(`${property}:${value}`);
    if (property === 'font-weight' && /^(normal|bold|400|500|600|700)$/i.test(value)) allowed.push(`${property}:${value}`);
    if (property === 'font-style' && /^(normal|italic)$/i.test(value)) allowed.push(`${property}:${value}`);
    if (property === 'text-decoration' && /^(none|underline|line-through)$/i.test(value)) allowed.push(`${property}:${value}`);
  });
  return allowed.join(';');
}

function fontSizeFromLegacyValue(value) {
  return ({1:'12px', 2:'12px', 3:'14px', 4:'16px', 5:'20px', 6:'24px', 7:'32px'})[String(value)] || '';
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue);
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  let tag = node.tagName.toLowerCase();
  let style = '';
  if (tag === 'font') {
    tag = 'span';
    const styles = [];
    const face = node.getAttribute('face');
    const size = fontSizeFromLegacyValue(node.getAttribute('size'));
    if (face && /^[a-z0-9 ,"'_-]+$/i.test(face)) styles.push(`font-family:${face}`);
    if (size) styles.push(`font-size:${size}`);
    style = safeStyle(styles.join(';'));
  }
  if (!ALLOWED_TAGS.has(tag)) return Array.from(node.childNodes).map(sanitizeNode).join('');

  if (tag === 'a') {
    const href = safeContentUrl(node.getAttribute('href'));
    const children = Array.from(node.childNodes).map(sanitizeNode).join('');
    if (!href) return children;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${children}</a>`;
  }

  if (!style) style = safeStyle(node.getAttribute('style'));
  const align = node.getAttribute('align');
  if (align && /^(left|center|right|justify)$/i.test(align)) style = safeStyle(`${style};text-align:${align}`);
  const attributes = style ? ` style="${escapeHtml(style)}"` : '';
  const children = Array.from(node.childNodes).map(sanitizeNode).join('');
  return VOID_TAGS.has(tag) ? `<${tag}>` : `<${tag}${attributes}>${children}</${tag}>`;
}

export function sanitizeHtml(raw) {
  if (typeof document === 'undefined') return '';
  const template = document.createElement('template');
  template.innerHTML = String(raw || '');
  return Array.from(template.content.childNodes).map(sanitizeNode).join('');
}

export function contentToHtml(raw) {
  const value = String(raw || '');
  return HTML_CONTENT_PATTERN.test(value) ? sanitizeHtml(value) : markdownToHtml(value);
}

export function textContent(raw) {
  if (typeof document === 'undefined') return String(raw || '').replace(/<[^>]*>/g, ' ').trim();
  const template = document.createElement('template');
  template.innerHTML = sanitizeHtml(raw);
  return template.content.textContent.replace(/\s+/g, ' ').trim();
}
