// Dodo Payments Checkout Session Creator
// Called from the frontend when a user clicks "REGISTER NOW"

export default async function handler(req, res) {
  // Enable CORS for same-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body || {};

  const DODO_API_KEY = process.env.DODO_API_KEY;
  if (!DODO_API_KEY) {
    console.error('Missing DODO_API_KEY environment variable');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://traderpip.vercel.app';

  try {
    // Try the correct Dodo Payments API endpoint
    const dodoEndpoint = 'https://live.dodopayments.com/api/v1/checkout-sessions';

    console.log('Calling Dodo API:', dodoEndpoint);

    const response = await fetch(dodoEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          name: 'PIP League — Competition Entry',
          description: 'Season 1 trading competition entry fee',
          amount: 1000, // $10.00 in cents
          currency: 'USD',
          quantity: 1,
        }],
        success_url: `${baseUrl}/?payment=success`,
        cancel_url: `${baseUrl}/?payment=cancel`,
        ...(email && { customer_email: email }),
        metadata: {
          product: 'pip_league_entry',
          entry_fee: '10',
          ...(name && { customer_name: name }),
        },
      }),
    });

    // Log response for debugging
    const responseText = await response.text();
    console.log('Dodo API response status:', response.status);
    console.log('Dodo API response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: 'Invalid response from payment provider',
        details: responseText.substring(0, 500),
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        error: 'Payment provider error',
        status: response.status,
        details: responseData,
      });
    }

    // Different possible field names for the checkout URL
    const checkoutUrl = responseData.payment_url
      || responseData.url
      || responseData.checkout_url
      || responseData.redirect_url;

    if (!checkoutUrl) {
      console.error('No checkout URL in response:', responseData);
      return res.status(502).json({
        error: 'No checkout URL returned from payment provider',
        data: responseData,
      });
    }

    return res.status(200).json({ checkout_url: checkoutUrl });
  } catch (err) {
    console.error('Dodo Payments request failed:', err);
    return res.status(502).json({
      error: 'Failed to create checkout session',
      message: err.message,
    });
  }
}
