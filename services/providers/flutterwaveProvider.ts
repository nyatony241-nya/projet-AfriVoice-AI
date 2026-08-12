const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
});

export const initializePayment = async (
  amount: number,
  currency: string,
  email: string,
  redirectUrl: string,
  paymentType: string,
  metadata?: Record<string, string>
) => {
  // Mock implementation
  return {
    paymentLink: `https://flutterwave.com/pay/mock_${Date.now()}`,
    reference: `flw_${Date.now()}`
  };
};

export const verifyTransaction = async (transactionId: string) => {
  // Mock implementation
  return {
    status: 'successful',
    amount: 1000,
    currency: 'NGN'
  };
};
