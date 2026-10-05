const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://sweet-mink-292854.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAABHf2AAIgcDE3ZThhMWNiZGI2YTc0ZDRlODk4YTNjYWNkOTkwOGNjOA';

export async function redisGet(key) {
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.result) return null;
    try {
      return JSON.parse(json.result);
    } catch {
      return json.result;
    }
  } catch (err) {
    console.error('redisGet error:', err);
    return null;
  }
}

export async function redisSet(key, value) {
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const res = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    });
    return res.ok;
  } catch (err) {
    console.error('redisSet error:', err);
    return false;
  }
}
