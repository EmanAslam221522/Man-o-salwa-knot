import { redisGet, redisSet } from '../_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ADMIN_REQUESTS_KEY = 'salwa:admin_requests';

  if (req.method === 'GET') {
    try {
      const data = await redisGet(ADMIN_REQUESTS_KEY);
      const requests = Array.isArray(data) ? data : [];
      return res.status(200).json({ success: true, requests });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const email = (body.email || '').toLowerCase().trim();
      const name = (body.name || 'Admin Applicant').trim();
      const reason = (body.reason || 'Requested Administrator login access via portal').trim();

      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      const existingData = await redisGet(ADMIN_REQUESTS_KEY);
      let requests = Array.isArray(existingData) ? existingData : [];

      const existingIdx = requests.findIndex(r => r.email === email);
      const newReq = {
        id: 'req-' + Date.now(),
        name,
        email,
        reason,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };

      if (existingIdx >= 0) {
        requests[existingIdx] = { ...requests[existingIdx], status: 'pending', requestedAt: new Date().toISOString(), reason, name };
      } else {
        requests.unshift(newReq);
      }

      await redisSet(ADMIN_REQUESTS_KEY, requests);

      // Dispatch Email with 1-Click Grant Access Button to emanaslam543@gmail.com
      const approveUrl = `https://man-o-salwa-knot.vercel.app/api/admin/approve?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
      const consoleUrl = `https://man-o-salwa-knot.vercel.app`;
      const resendKey = process.env.RESEND_API_KEY || Buffer.from('cmVfMjJ6VVA4QlZfTWlMZlVFcVRSMXd2ZWl3cmpUR05XZFU0', 'base64').toString('utf8');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #001F3F; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <div style="background-color: #001F3F; color: white; padding: 26px; text-align: center;">
            <div style="display: inline-block; background-color: rgba(76,175,80,0.15); border: 1px solid #4CAF50; border-radius: 30px; padding: 4px 14px; margin-bottom: 8px;">
              <span style="color: #4CAF50; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Security & Access Control</span>
            </div>
            <h2 style="margin: 0; color: #ffffff; font-size: 22px;">Administrator Access Request</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">An account is requesting permission to log in as Administrator</p>
          </div>

          <div style="padding: 26px;">
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 10px; margin-bottom: 22px;">
              <strong style="color: #92400e; font-size: 13px; display: block; margin-bottom: 4px;">⚠️ Verification Required</strong>
              <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">This user cannot log in with Administrator privileges until you approve this request.</p>
            </div>

            <h3 style="color: #001F3F; font-size: 15px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Applicant Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Applicant Name:</td>
                <td style="padding: 8px 0; color: #001F3F; font-weight: bold;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Email Address:</td>
                <td style="padding: 8px 0; color: #001F3F; font-family: monospace; font-weight: bold;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Reason / Context:</td>
                <td style="padding: 8px 0; color: #334155;">${reason}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Time Requested:</td>
                <td style="padding: 8px 0; color: #64748b;">${new Date().toLocaleString()}</td>
              </tr>
            </table>

            <div style="text-align: center; margin: 30px 0 16px 0;">
              <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(76,175,80,0.3);">
                🔓 Grant Admin Access (1-Click Approve)
              </a>
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${consoleUrl}" style="color: #64748b; font-size: 13px; text-decoration: underline;">
                Or open Administrator Workspace
              </a>
            </div>
          </div>

          <div style="background-color: #f8fafc; color: #94a3b8; padding: 16px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0;">
            ManOSalwaKnot Food Rescue Platform · Security & Authorization Gateway
          </div>
        </div>
      `;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ManOSalwaKnot <onboarding@resend.dev>',
            to: ['emanaslam543@gmail.com'],
            subject: `[ACTION REQUIRED] Admin Access Request: ${name} (${email})`,
            html: htmlContent,
          }),
        });
      } catch (e) {
        console.error('Failed to send admin notification email:', e);
      }

      return res.status(200).json({ success: true, request: newReq });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
