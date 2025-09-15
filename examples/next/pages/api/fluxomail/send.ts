// Example Next.js Pages Router API to send an email via server-side API key
// Do not call this from the browser directly; call from your app server.

import type { NextApiRequest, NextApiResponse } from 'next'
import { Fluxomail } from '@fluxomail/sdk'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const { to, subject, content, htmlContent } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const fm = new Fluxomail({ apiKey: process.env.FLUXOMAIL_API_KEY })
    const out = await fm.sends.send({ to, subject, content, htmlContent, idempotencyKey: `req-${Date.now()}` })
    res.status(200).json(out)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'internal_error' })
  }
}

