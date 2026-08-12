const PAYSTACK_API_BASE = 'https://api.paystack.co';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
});

export const initializePayment = async (
  amount: number,
  currency: string,
  email: string,
  callbackUrl: string,
  metadata?: Record<string, string>
) => {
  // Mock implementation
  return {
    authorizationUrl: `https://checkout.paystack.com/mock_${Date.now()}`,
    reference: `pstk_${Date.now()}`
  };
};

export const verifyPayment = async (reference: string) => {
  // Mock implementation
  return {
    status: 'success',
    amount: 1000,
    currency: 'NGN'
  };
};
