export function getSiteUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
