/**
 * URL of a catalog file under `/data/`. With its hash, the URL is versioned (`?v=<sha>`): immutable, served from
 * the service worker catalog cache and cached there on first download. Without a hash it stays a plain network URL.
 */
export function catalogDataUrl(origin: string, filename: string, expectedHash?: string): string {
  const url = `${origin}/data/${filename}`;
  return expectedHash ? `${url}?v=${encodeURIComponent(expectedHash)}` : url;
}
