import { redisGet } from '../_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const APPROVED_ADMINS_KEY = 'salwa:approved_admins';
  const email = (req.query.email || req.body?.email || '').toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email parameter required' });
  }

  if (email === 'emanaslam543@gmail.com') {
    return res.status(200).json({ success: true, approved: true, isMainAdmin: true });
  }

  try {
    const approvedData = await redisGet(APPROVED_ADMINS_KEY);
    const approvedList = Array.isArray(approvedData) ? approvedData : ['emanaslam543@gmail.com'];
    const isApproved = approvedList.some(e => e.toLowerCase() === email);
    return res.status(200).json({ success: true, approved: isApproved, email });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
