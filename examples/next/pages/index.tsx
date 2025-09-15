import { useEffect, useRef, useState } from 'react'
import { Fluxomail } from '@fluxomail/sdk'

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const subRef = useRef<ReturnType<Fluxomail['events']['subscribe']> | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      // Fetch a short-lived token from your server
      const resp = await fetch('/api/fluxomail/token', { method: 'POST', body: JSON.stringify({ organizationId: 'org_123' }) })
      const { token } = await resp.json()

      const fm = new Fluxomail({ token, getToken: async () => {
        // Auto-refresh token when REST calls encounter 401
        const r = await fetch('/api/fluxomail/token', { method: 'POST', body: JSON.stringify({ organizationId: 'org_123' }) })
        const j = await r.json()
        return j.token
      }})

      // Subscribe to realtime events
      const sub = fm.events.subscribe({ types: ['email.*'], checkpoint: {
        get: () => localStorage.getItem('fluxo:lastEventId') || undefined,
        set: (id) => localStorage.setItem('fluxo:lastEventId', id)
      } }, (evt) => {
        if (!mounted) return
        setEvents((prev) => [evt, ...prev].slice(0, 100))
      })
      subRef.current = sub
    })()

    return () => {
      mounted = false
      subRef.current?.close()
    }
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1>Fluxomail Events</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(events, null, 2)}</pre>
    </main>
  )
}

