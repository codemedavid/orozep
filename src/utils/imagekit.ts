// ImageKit on-the-fly resizing helper.
//
// Product/review/COA image URLs are stored as full-resolution ImageKit
// originals. Rendering them raw ships multi-MB phone photos even into tiny
// grid thumbnails, which burns the account's monthly bandwidth quota.
//
// ikImage() appends ImageKit `tr` transformation params so the CDN serves a
// resized, compressed, auto-format (WebP/AVIF) variant instead. Non-ImageKit
// URLs (and empty values) are returned untouched, so it's safe to wrap any src.

interface IkOptions {
  /** target width in px */
  w?: number;
  /** target height in px */
  h?: number;
  /** quality 1-100 (default 70) */
  q?: number;
}

export function ikImage(url: string | null | undefined, opts: IkOptions = {}): string {
  if (!url || !url.includes('ik.imagekit.io')) return url || '';

  const { w, h, q = 70 } = opts;
  const parts: string[] = [];
  if (w) parts.push(`w-${w}`);
  if (h) parts.push(`h-${h}`);
  parts.push(`q-${q}`);
  parts.push('f-auto'); // serve WebP/AVIF when the browser supports it

  const tr = `tr=${parts.join(',')}`;
  return url.includes('?') ? `${url}&${tr}` : `${url}?${tr}`;
}
