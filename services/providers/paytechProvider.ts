const PAYTECH_API_BASE = 'https://paytech.sn/api/payment/request-payment';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'API_KEY': process.env.PAYTECH_API_KEY || '',
  'API_SECRET': process.env.PAYTECH_API_SECRET || ''
});

export const createPayment = async (
  amount: number,
  currency: string,
  description: string,
  successUrl: string,
  cancelUrl: string,
  customerInfo?: Record<string, string>
) => {
  // Mock implementation
  return {
    paymentUrl: `https://paytech.sn/payment/mock_${Date.now()}`,
    reference: `ptch_${Date.now()}`
  };
};

export const checkPaymentStatus = async (reference: string) => {
  // Mock implementation
  return {
    status: 'success',
    amount: 1000
  };
};
