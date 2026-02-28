/**
 * Escapes special regex characters in a string for safe use in RegExp.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts the base URL (protocol + host) from a full URL.
 * e.g., "https://app.example.com/login?foo=bar" → "https://app.example.com"
 */
export function extractBaseUrl(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fullUrl;
  }
}

/**
 * Converts an absolute URL to a relative path by stripping the base URL.
 * e.g., ("https://app.example.com/login", "https://app.example.com") → "/login"
 */
export function toRelativePath(absoluteUrl: string, baseUrl: string): string {
  const base = extractBaseUrl(baseUrl);
  if (absoluteUrl.startsWith(base)) {
    const relative = absoluteUrl.slice(base.length);
    return relative || '/';
  }
  return absoluteUrl;
}
