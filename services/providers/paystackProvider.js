// ── Paystack Provider (Server-side JS) ────────────────────────
// Fallback carte pour Nigeria, Ghana, Kenya, CI, Afrique du Sud

const PAYSTACK_API_BASE = 'https://api.paystack.co';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
});

export const initializePayment = async (amount, currency, email, callbackUrl, metadata = {}) => {
  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount: amount * 100, // Paystack expects amount in kobo/pesewas
      currency,
      email,
      callback_url: callbackUrl,
      metadata
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Paystack init failed: ${response.status}`);
  }

  const { data } = await response.json();
  return {
    authorizationUrl: data.authorization_url,
    reference: data.reference
  };
};

export const verifyPayment = async (reference) => {
  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Paystack verification failed');
  }

  const { data } = await response.json();
  return {
    status: data.status, // 'success', 'failed', 'abandoned'
    amount: data.amount / 100,
    currency: data.currency
  };
};
