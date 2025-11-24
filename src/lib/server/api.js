// ADD to src/lib/server/api.js
import 'server-only';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || 'https://empleosafari.com';

export async function getJobById(id, geo, { revalidate = 300 } = {}) {
  const url = `${API_ORIGIN}/api/jobs/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    cache: 'force-cache',
    next: { revalidate },            // enables ISR caching
    headers: {
      Accept: 'application/json',
      'CF-IPCountry': (geo?.country || '').toUpperCase(),
      'x-user-city' : geo?.city || '',
    },
  });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}
