import { redisGet, redisSet } from '../_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ADMIN_REQUESTS_KEY = 'salwa:admin_requests';
  const APPROVED_ADMINS_KEY = 'salwa:approved_admins';

  let email = '';
  if (req.method === 'GET') {
    email = (req.query.email || '').toLowerCase().trim();
  } else if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    email = (body?.email || req.query.email || '').toLowerCase().trim();
  }

  if (!email) {
    if (req.method === 'GET') {
      return res.redirect(302, 'https://man-o-salwa-knot.vercel.app/?error=missing_email');
    }
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    // 1. Update approved admins list in Redis
    const approvedData = await redisGet(APPROVED_ADMINS_KEY);
    let approvedList = Array.isArray(approvedData) ? approvedData : ['emanaslam543@gmail.com'];
    if (!approvedList.map(e => e.toLowerCase()).includes(email)) {
      approvedList.push(email);
    }
    await redisSet(APPROVED_ADMINS_KEY, approvedList);

    // 2. Update requests status in Redis
    const requestsData = await redisGet(ADMIN_REQUESTS_KEY);
    let requests = Array.isArray(requestsData) ? requestsData : [];
    let found = false;
    requests = requests.map(r => {
      if (r.email?.toLowerCase().trim() === email) {
        found = true;
        return { ...r, status: 'approved', approvedAt: new Date().toISOString() };
      }
      return r;
    });
    if (!found) {
      requests.push({
        id: 'req-' + Date.now(),
        name: 'Approved Administrator',
        email,
        reason: 'Manually verified and approved by Main Administrator',
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        status: 'approved',
      });
    }
    await redisSet(ADMIN_REQUESTS_KEY, requests);

    if (req.method === 'GET') {
      // Redirect to platform console with approval success flag
      return res.redirect(302, `https://man-o-salwa-knot.vercel.app/?admin_approved=${encodeURIComponent(email)}&status=granted`);
    }

    return res.status(200).json({ success: true, message: `Access granted for ${email}`, email });
  } catch (err) {
    console.error('Approval error:', err);
    if (req.method === 'GET') {
      return res.redirect(302, `https://man-o-salwa-knot.vercel.app/?error=${encodeURIComponent(err.message)}`);
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}
