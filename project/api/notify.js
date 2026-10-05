export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const foodDetails = body.foodDetails || body || {};
  const foodName = foodDetails.food_name || foodDetails.foodName || 'Admin Verification Request';
  const quantity = foodDetails.quantity || 1;
  const unit = foodDetails.unit || 'portions';
  const price = foodDetails.price || 0;
  const location = foodDetails.location_text || foodDetails.location || 'System Notification';
  const seller = foodDetails.sellerName || foodDetails.seller_name || 'Platform Security';

  const defaultKey = Buffer.from('cmVfMjJ6VVA4QlZfTWlMZlVFcVRSMXd2ZWl3cmpUR05XZFU0', 'base64').toString('utf8');
  const resendApiKey = process.env.RESEND_API_KEY || defaultKey;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #001F3F; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #001F3F; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; color: #4CAF50;">ManOSalwaKnot Alert</h2>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.85;">Surveillance & Notification Center</p>
      </div>
      <div style="padding: 24px;">
        <h3 style="color: #001F3F; margin-top: 0;">${foodName}</h3>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">${location}</p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0; font-size: 13px;">
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${foodName}</p>
          <p style="margin: 4px 0;"><strong>Details:</strong> ${quantity} ${unit}</p>
          <p style="margin: 4px 0;"><strong>Provider / Applicant:</strong> ${seller}</p>
          <p style="margin: 4px 0;"><strong>Value:</strong> Rs ${price}</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://man-o-salwa-knot.vercel.app" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Open Platform Console</a>
        </div>
      </div>
      <div style="background-color: #f3f4f6; color: #6b7280; padding: 16px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">ManOSalwaKnot Food Rescue Marketplace & Administrator Surveillance</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ManOSalwaKnot <onboarding@resend.dev>',
        to: ['emanaslam543@gmail.com'],
        subject: `[ManOSalwaKnot Alert] ${foodName}`,
        html: htmlContent
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
