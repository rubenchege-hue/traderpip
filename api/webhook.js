// Dodo Payments Webhook Handler
// Called by Dodo Payments when payment events occur

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;
  const signature = req.headers['webhook-signature'];
  const rawBody = JSON.stringify(req.body);

  // Verify webhook signature if secret is configured
  if (DODO_WEBHOOK_SECRET && signature) {
    try {
      const crypto = await import('crypto');
      const expectedSig = crypto
        .createHmac('sha256', DODO_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
      
      if (signature !== expectedSig) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      console.error('Signature verification error:', err);
      return res.status(500).json({ error: 'Verification failed' });
    }
  }

  const event = req.body;

  // Handle different event types
  switch (event.type || event.event) {
    case 'payment.succeeded':
    case 'checkout.session.completed':
      console.log('Payment successful:', {
        id: event.id || event.session_id,
        amount: event.amount_total || event.amount,
        email: event.customer_email || event.customer?.email,
        metadata: event.metadata,
      });
      // TODO: Add trader to competition, send confirmation email, etc.
      break;

    case 'payment.failed':
      console.log('Payment failed:', event.id || event.session_id);
      break;

    default:
      console.log('Unhandled event type:', event.type || event.event);
  }

  // Acknowledge receipt
  res.status(200).json({ received: true });
}
