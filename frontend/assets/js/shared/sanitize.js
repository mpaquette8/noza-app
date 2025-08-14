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

export default sanitizeInput;
