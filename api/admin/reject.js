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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const email = (body?.email || req.query.email || '').toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    // 1. Remove from approved admins list (unless main admin)
    if (email !== 'emanaslam543@gmail.com') {
      const approvedData = await redisGet(APPROVED_ADMINS_KEY);
      let approvedList = Array.isArray(approvedData) ? approvedData : ['emanaslam543@gmail.com'];
      approvedList = approvedList.filter(e => e.toLowerCase() !== email);
      await redisSet(APPROVED_ADMINS_KEY, approvedList);
    }

    // 2. Mark request as rejected
    const requestsData = await redisGet(ADMIN_REQUESTS_KEY);
    let requests = Array.isArray(requestsData) ? requestsData : [];
    requests = requests.map(r => {
      if (r.email?.toLowerCase().trim() === email) {
        return { ...r, status: 'rejected', rejectedAt: new Date().toISOString() };
      }
      return r;
    });
    await redisSet(ADMIN_REQUESTS_KEY, requests);

    return res.status(200).json({ success: true, message: `Access denied for ${email}`, email });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
