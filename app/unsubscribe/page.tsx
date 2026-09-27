export const dynamic = 'force-dynamic'

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { done?: string }
}) {
  const done = searchParams?.done === '1'
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
          {done ? 'You’ve been unsubscribed' : 'Unsubscribe'}
        </h1>
        <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
          {done
            ? 'You will no longer receive marketing emails from Friendly Party Rental NYC. Order-related emails (like confirmations and balance reminders) may still be sent for any active reservations.'
            : 'It looks like this link is missing information. If you meant to unsubscribe, please use the link at the bottom of the email you received.'}
        </p>
        <p style={{ marginTop: 20 }}>
          <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>
            Return to Friendly Party Rental
          </a>
        </p>
      </div>
    </div>
  )
}

