// Minimal Cloudflare Workers example using Fluxomail API via fetch.
// Note: EventSource/SSE is not available in Workers; use backfill with polling instead.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname === '/send') {
      const body = await request.json().catch(() => ({}))
      const res = await fetch('https://api.fluxomail.com/api/v1/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.FLUXOMAIL_API_KEY}`,
          'Fluxomail-Version': '2025-09-01'
        },
        body: JSON.stringify({ to: body.to, subject: body.subject, content: body.content, htmlContent: body.htmlContent })
      })
      return new Response(await res.text(), { status: res.status, headers: res.headers })
    }
    if (url.pathname === '/events') {
      const res = await fetch('https://api.fluxomail.com/api/v1/events?limit=10', {
        headers: { 'Authorization': `Bearer ${env.FLUXOMAIL_API_KEY}`, 'Fluxomail-Version': '2025-09-01' }
      })
      return new Response(await res.text(), { status: res.status, headers: res.headers })
    }
    return new Response('ok', { status: 200 })
  }
}

