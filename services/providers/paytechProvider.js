// ── PayTech Provider (Server-side JS) ─────────────────────────
// Fallback Sénégal — Orange Money, Wave, Free Money

const PAYTECH_API_BASE = 'https://paytech.sn/api/payment';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'API_KEY': process.env.PAYTECH_API_KEY || '',
  'API_SECRET': process.env.PAYTECH_API_SECRET || ''
});

export const createPayment = async (amount, currency, description, successUrl, cancelUrl, customerInfo = {}) => {
  const reference = `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const response = await fetch(`${PAYTECH_API_BASE}/request-payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      item_name: description,
      item_price: amount,
      currency,
      ref_command: reference,
      command_name: `AfriVoice - ${description}`,
      success_url: successUrl,
      cancel_url: cancelUrl,
      env: process.env.NODE_ENV === 'production' ? 'prod' : 'test',
      custom_field: JSON.stringify(customerInfo)
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `PayTech init failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    paymentUrl: data.redirect_url || data.payment_url,
    reference
  };
};

export const checkPaymentStatus = async (reference) => {
  // PayTech utilise les webhooks pour la notification.
  // Ce endpoint est un fallback pour vérification manuelle.
  const response = await fetch(`${PAYTECH_API_BASE}/check-status`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ref_command: reference })
  });

  if (!response.ok) {
    throw new Error('PayTech status check failed');
  }

  const data = await response.json();
  return {
    status: data.status || 'pending',
    amount: data.amount || 0
  };
};
