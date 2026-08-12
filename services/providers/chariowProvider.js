// ── Chariow Provider (Server-side JS) ─────────────────────────
// Provider principal — API Chariow pour checkout et licences

import crypto from 'crypto';

const CHARIOW_API_BASE = 'https://api.chariow.com/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.CHARIOW_API_KEY}`
});

export const initiateCheckout = async (productId, customerEmail, successUrl, cancelUrl, metadata = {}) => {
  const response = await fetch(`${CHARIOW_API_BASE}/checkout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      product_id: productId,
      customer: { email: customerEmail },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Chariow checkout failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    checkoutUrl: data.data?.checkout_url || data.checkout_url,
    transactionRef: data.data?.id || `char_txn_${Date.now()}`
  };
};

export const validateLicense = async (licenseKey) => {
  const response = await fetch(`${CHARIOW_API_BASE}/licenses/${encodeURIComponent(licenseKey)}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Invalid license key');
  }

  const { data } = await response.json();
  return {
    key: licenseKey,
    isActive: data.is_active,
    isExpired: data.is_expired,
    expiresAt: data.expires_at || null,
    planId: data.metadata?.planId || 'creator',
    status: data.status,
    activationsRemaining: data.activations?.remaining
  };
};

export const activateLicense = async (licenseKey, deviceId) => {
  const response = await fetch(`${CHARIOW_API_BASE}/licenses/${encodeURIComponent(licenseKey)}/activate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ device_identifier: deviceId })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'License activation failed');
  }

  const { data } = await response.json();
  return {
    success: true,
    activationsRemaining: data.activations?.remaining ?? 0
  };
};

export const verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  
  const expected = crypto.createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
  return signature === expected;
};
