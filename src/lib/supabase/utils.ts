export function getSiteUrl() {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000';

  // Include https:// if not present
  url = url.startsWith('http') ? url : `https://${url}`;
  // Remove trailing slash if present
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  return url;
}
