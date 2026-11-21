/**
 * Resolves an image URL so relative backend upload paths (/uploads/...)
 * point to the active backend origin (production or configured API base).
 */
export function resolveImageUrl(url: string | null | undefined, fallback = '/images/food/other-default.svg'): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }
  const trimmed = url.trim();

  // Keep absolute external URLs and inline data/blob URIs intact
  if (/^(https?:|\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  // Local bundled frontend assets (e.g., /images/...)
  if (trimmed.startsWith('/images/')) {
    return trimmed;
  }

  // Uploaded images from backend (/uploads/...)
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const apiBase = import.meta.env.VITE_API_BASE_URL;

    if (apiBase && typeof apiBase === 'string') {
      try {
        const parsed = new URL(apiBase, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
        return `${parsed.origin}${cleanPath}`;
      } catch {
        // Fallback below
      }
    }

    // In production (Cloudflare Pages or external host), point to the Render backend origin
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `https://sharebite-1eho.onrender.com${cleanPath}`;
    }

    // Local dev: Vite proxy forwards /uploads to 127.0.0.1:8080
    return cleanPath;
  }

  return trimmed;
}
