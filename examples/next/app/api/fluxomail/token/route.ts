// Next.js App Router example route handler for minting a short-lived Fluxomail token.
// Replace with real server-side logic that integrates with your auth/email-service.

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId, organizationId } = body
    const token = 'replace-with-real-short-lived-token'
    return Response.json({ token })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

