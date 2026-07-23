function isNonEmptyString(value, maxLen = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLen;
}

function isValidImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return true;
  } catch {
    return false;
  }
}

function isValidInt(value) {
  return Number.isInteger(value) || (typeof value === 'string' && /^-?\d+$/.test(value));
}

function toIntOrNull(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

// Strip control characters and cap length; the frontend renders comment/nickname
// text with textContent (never innerHTML), so this is a sanity/length guard
// rather than an HTML-escaping step — no markup can execute either way.
function cleanText(value, maxLen = 1000) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

module.exports = { isNonEmptyString, isValidImageUrl, isValidInt, toIntOrNull, cleanText };
