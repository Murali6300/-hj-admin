/**
 * Resolve a relative image URL (e.g. /uploads/...) to a full URL.
 * In dev mode the Vite proxy handles /uploads/*, so relative works.
 * In production, prefix with the API base URL.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  if (import.meta.env.PROD) {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return `${base}${url}`;
  }
  return url;
}
