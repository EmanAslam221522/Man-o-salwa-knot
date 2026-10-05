import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-notify',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/notify' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const foodDetails = parsed.foodDetails || parsed || {};
                const foodName = foodDetails.food_name || foodDetails.foodName || 'Admin Verification Request';
                const quantity = foodDetails.quantity || 1;
                const unit = foodDetails.unit || 'portions';
                const price = foodDetails.price || 0;
                const location = foodDetails.location_text || 'System Notification';
                const seller = foodDetails.sellerName || foodDetails.seller_name || 'Platform Security';

                const defaultKey = Buffer.from('cmVfMjJ6VVA4QlZfTWlMZlVFcVRSMXd2ZWl3cmpUR05XZFU0', 'base64').toString('utf8');
                const resendApiKey = process.env.RESEND_API_KEY || defaultKey;

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
                    html: `<div style="font-family: Arial, sans-serif; color: #001F3F; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;"><h2 style="color: #4CAF50;">ManOSalwaKnot Alert</h2><p><strong>Subject:</strong> ${foodName}</p><p><strong>Details:</strong> ${quantity} ${unit}</p><p><strong>Provider:</strong> ${seller}</p><p><strong>Price:</strong> Rs ${price}</p><p><strong>Location:</strong> ${location}</p></div>`
                  })
                });
                const data = await response.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
