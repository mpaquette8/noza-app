/**
 * Sanitize user-provided input while preserving Unicode letters and punctuation.
 * This logic is mirrored in backend/src/utils/helpers.js; update both places when
 * changing the allowed character set or behavior.
 *
 * @param {string} input - The raw input string to clean.
 * @param {number} [maxLength=10000] - Maximum length of the returned string.
 * @returns {string} The sanitized string limited to the specified length.
 */
export function sanitizeInput(input, maxLength = 10000) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/<[^>]*>/g, '')
    .trim()
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}\n\r]/gu, '')
    .substring(0, maxLength);
}

/**
 * Basic HTML sanitizer that strips out potentially dangerous tags and
 * attributes. This is a lightweight alternative to DOMPurify and should be
 * complemented by server-side sanitization.
 *
 * @param {string} html - Raw HTML string to clean.
 * @param {number} [maxLength=100000] - Maximum length of returned HTML.
 * @returns {string} Sanitized HTML string.
 */
export function sanitizeHTML(html, maxLength = 100000) {
  if (typeof html !== 'string') return html;

  return html
    // Remove script-like elements entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '')
    // Strip event handler attributes (onclick, onload, ...)
    .replace(/ on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .substring(0, maxLength);
}

export default sanitizeInput;
