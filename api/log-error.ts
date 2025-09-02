import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { error, context, timestamp } = req.body;
    
    // Log estruturado
    console.error('Frontend Error:', {
      error,
      context,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error logging frontend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}