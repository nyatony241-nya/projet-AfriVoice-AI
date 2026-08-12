const PAWAPAY_API_BASE = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.PAWAPAY_API_TOKEN}`
});

export const initiateDeposit = async (
  amount: number,
  currency: string,
  phoneNumber: string,
  correspondentId: string,
  metadata?: Record<string, string>
) => {
  // Mock implementation
  return {
    depositId: `pawa_${Date.now()}`,
    status: 'PENDING'
  };
};

export const checkDepositStatus = async (depositId: string) => {
  // Mock implementation
  return {
    status: 'COMPLETED',
    amount: 1000
  };
};
