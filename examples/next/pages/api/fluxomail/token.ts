// Example Next.js API route that returns a short-lived Fluxomail token.
// Replace the body with your own server-side integration that talks to your
// auth service or email-service to mint a scoped, expiring token.

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  try {
    const { userId, organizationId } = JSON.parse(String(req.body || '{}'))
    // TODO: Implement token minting on your server.
    // For example:
    // const token = await createFluxomailToken({ userId, organizationId, ttlSeconds: 300 })
    const token = 'replace-with-real-short-lived-token'
    res.status(200).json({ token })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'internal_error' })
  }
}

