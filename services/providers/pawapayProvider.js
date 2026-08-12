// ── PawaPay Provider (Server-side JS) ─────────────────────────
// Fallback Mobile Money — 20 pays africains, 42 opérateurs

const getBaseUrl = () => process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.PAWAPAY_API_TOKEN}`
});

export const initiateDeposit = async (amount, currency, phoneNumber, correspondentId, metadata = {}) => {
  const depositId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const response = await fetch(`${getBaseUrl()}/deposits`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      depositId,
      amount: String(amount),
      currency,
      correspondent: correspondentId,
      payer: { 
        type: 'MSISDN',
        address: { value: phoneNumber }
      },
      statementDescription: 'AfriVoice Plan',
      metadata: Object.entries(metadata).map(([k, v]) => ({ fieldName: k, fieldValue: String(v) }))
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `PawaPay deposit failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    depositId: data.depositId || depositId,
    status: data.status || 'ACCEPTED'
  };
};

export const checkDepositStatus = async (depositId) => {
  const response = await fetch(`${getBaseUrl()}/deposits/${depositId}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('PawaPay status check failed');
  }

  const data = await response.json();
  return {
    status: data[0]?.status || 'PENDING',
    amount: parseFloat(data[0]?.amount || '0')
  };
};
