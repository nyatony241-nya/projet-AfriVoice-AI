// ── Flutterwave Provider (Server-side JS) ─────────────────────
// Fallback universel — 35+ pays africains, carte + mobile money

const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
});

export const initializePayment = async (amount, currency, email, redirectUrl, paymentType = 'card', metadata = {}) => {
  const txRef = `flw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const response = await fetch(`${FLUTTERWAVE_API_BASE}/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: redirectUrl,
      customer: { email },
      payment_options: paymentType === 'mobile_money' ? 'mobilemoneyghana,mobilemoneyuganda' : 'card',
      meta: metadata,
      customizations: {
        title: 'AfriVoice',
        description: 'AfriVoice Plan Subscription',
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Flutterwave init failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    paymentLink: data.data?.link,
    reference: txRef
  };
};

export const verifyTransaction = async (transactionId) => {
  const response = await fetch(`${FLUTTERWAVE_API_BASE}/transactions/${transactionId}/verify`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Flutterwave verification failed');
  }

  const data = await response.json();
  return {
    status: data.data?.status, // 'successful', 'failed'
    amount: data.data?.amount,
    currency: data.data?.currency
  };
};
