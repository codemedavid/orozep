import crypto from 'crypto';

/**
 * Returns one-time client-side upload auth params for ImageKit.
 * The private key never leaves the server. The browser uses
 * { token, expire, signature, publicKey } to upload directly to ImageKit.
 *
 * Required env vars (set in Vercel):
 *   IMAGEKIT_PRIVATE_KEY        - secret, server only
 *   VITE_IMAGEKIT_PUBLIC_KEY    - public key (also exposed to frontend)
 *   VITE_IMAGEKIT_URL_ENDPOINT  - e.g. https://ik.imagekit.io/your_id
 */
export default async function handler(req: any, res: any) {
  // Allow simple CORS so the SPA can call this in any environment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey =
    process.env.VITE_IMAGEKIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint =
    process.env.VITE_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !publicKey) {
    return res
      .status(500)
      .json({ error: 'ImageKit keys are not configured on the server' });
  }

  // token: unique value per request; expire: unix seconds, < 1 hour ahead
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes

  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  return res.status(200).json({ token, expire, signature, publicKey, urlEndpoint });
}
