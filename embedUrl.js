/**
 * Admin can paste a bare URL, a "watch page" URL, or a full <iframe> embed
 * code for either Dailymotion (primary) or Rumble (backup). This module
 * pulls out a real URL, checks it's actually from the right host, and
 * normalizes it to an embeddable form.
 */

const DAILYMOTION_HOSTS = ['dailymotion.com', 'www.dailymotion.com', 'dai.ly'];
const RUMBLE_HOSTS = ['rumble.com', 'www.rumble.com'];

function extractSrcFromIframe(input) {
  const match = input.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {string} input - raw URL, watch-page URL, or <iframe> code
 * @param {'dailymotion'|'rumble'} provider
 * @returns {{ ok: true, url: string } | { ok: false, error: string }}
 */
function normalizeEmbedUrl(input, provider) {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return { ok: false, error: 'URL is required' };
  }

  const trimmed = input.trim();
  const candidate = trimmed.includes('<iframe') ? extractSrcFromIframe(trimmed) : trimmed;

  if (!candidate) {
    return { ok: false, error: 'Could not find a src URL inside the pasted embed code' };
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: 'Not a valid URL' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'URL must be http(s)' };
  }

  const hostname = getHostname(candidate);
  const allowedHosts = provider === 'dailymotion' ? DAILYMOTION_HOSTS : RUMBLE_HOSTS;
  if (!allowedHosts.includes(hostname)) {
    return {
      ok: false,
      error: `URL host "${hostname}" is not a recognized ${provider} domain`,
    };
  }

  if (provider === 'dailymotion') {
    return { ok: true, url: normalizeDailymotion(url) };
  }
  return { ok: true, url: normalizeRumble(url) };
}

function normalizeDailymotion(url) {
  // dai.ly/xxxxx  ->  dailymotion.com/embed/video/xxxxx
  if (url.hostname === 'dai.ly') {
    const id = url.pathname.replace(/^\//, '');
    return `https://www.dailymotion.com/embed/video/${id}`;
  }
  // dailymotion.com/video/xxxxx  ->  dailymotion.com/embed/video/xxxxx
  const videoMatch = url.pathname.match(/^\/video\/([a-zA-Z0-9]+)/);
  if (videoMatch) {
    return `https://www.dailymotion.com/embed/video/${videoMatch[1]}`;
  }
  // already an /embed/video/xxxxx URL — keep as-is
  if (url.pathname.startsWith('/embed/video/')) {
    return `https://www.dailymotion.com${url.pathname}`;
  }
  // Anything else on the right domain: pass through unchanged rather than
  // reject outright, since Dailymotion has a few legacy URL shapes.
  return url.toString();
}

function normalizeRumble(url) {
  // Already an embed URL — keep as-is.
  if (url.pathname.startsWith('/embed/')) {
    return url.toString();
  }
  // A rumble.com/v<id>-slug.html watch page cannot be reliably converted to
  // an embed id by string manipulation alone (Rumble's embed id differs from
  // the vanity slug). Pass it through — normalizeEmbedUrl() still confirms
  // the domain is legitimate — but the admin UI should nudge toward pasting
  // the actual embed code from Rumble's "Embed" share option for reliability.
  return url.toString();
}

module.exports = { normalizeEmbedUrl };
