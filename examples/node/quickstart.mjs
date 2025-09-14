import { Fluxomail } from '../../dist/index.js'

async function main() {
  const fm = new Fluxomail({ apiKey: process.env.FLUXOMAIL_API_KEY })

  await fm.sends.send({
    to: 'user@example.com',
    from: 'no-reply@yourdomain.com',
    subject: 'Hello',
    html: '<strong>Hi!</strong>',
    idempotencyKey: `demo-${Date.now()}`,
  })

  const sub = fm.events.subscribe({ types: ['email.*'] }, (evt) => {
    console.log('event:', evt)
  })

  setTimeout(() => sub.close(), 5000)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
