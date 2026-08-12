import { getPaymentConfigForCountry, CHARIOW_PRODUCTS } from './paymentConfig';
import { PaymentMethod, PaymentProvider } from '../types';
import * as chariowProvider from './providers/chariowProvider';
import * as paystackProvider from './providers/paystackProvider';
import * as pawapayProvider from './providers/pawapayProvider';
import * as flutterwaveProvider from './providers/flutterwaveProvider';
import * as paytechProvider from './providers/paytechProvider';

export const routePayment = async (
  countryId: string,
  planId: 'starter' | 'creator' | 'pro',
  customerEmail: string,
  paymentMethod: PaymentMethod,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkoutUrl: string; provider: PaymentProvider; transactionRef: string }> => {
  const config = getPaymentConfigForCountry(countryId);
  
  if (!config) {
    throw new Error(`Payment configuration not found for country: ${countryId}`);
  }

  // Get pricing based on product/plan
  const product = CHARIOW_PRODUCTS[planId];
  if (!product) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  
  const amount = product.priceXOF; // For simplicity, we just pass the base amount. In real implementation, convert if currency differs.
  const currency = config.currency;
  const metadata = { countryId, planId, customerEmail };

  try {
    // Try primary provider (Chariow)
    if (config.primaryProvider === 'chariow') {
      const response = await chariowProvider.initiateCheckout(
        product.id,
        customerEmail,
        successUrl,
        cancelUrl,
        metadata
      );
      return {
        checkoutUrl: response.checkoutUrl,
        provider: 'chariow',
        transactionRef: response.transactionRef
      };
    }
    throw new Error(`Unsupported primary provider: ${config.primaryProvider}`);
  } catch (error) {
    console.error(`Primary provider (${config.primaryProvider}) failed:`, error);
    
    // Fallback logic
    if (config.fallbackProvider) {
      console.log(`Trying fallback provider: ${config.fallbackProvider}`);
      
      switch (config.fallbackProvider) {
        case 'paystack': {
          const res = await paystackProvider.initializePayment(amount, currency, customerEmail, successUrl, metadata);
          return { checkoutUrl: res.authorizationUrl, provider: 'paystack', transactionRef: res.reference };
        }
        case 'pawapay': {
          // pawapay usually needs phone number instead of email, mocked here
          const res = await pawapayProvider.initiateDeposit(amount, currency, '000000000', 'MTN', metadata);
          return { checkoutUrl: successUrl, provider: 'pawapay', transactionRef: res.depositId }; // fake checkout URL
        }
        case 'flutterwave': {
          const res = await flutterwaveProvider.initializePayment(amount, currency, customerEmail, successUrl, paymentMethod, metadata);
          return { checkoutUrl: res.paymentLink, provider: 'flutterwave', transactionRef: res.reference };
        }
        case 'paytech': {
          const res = await paytechProvider.createPayment(amount, currency, `Payment for ${planId}`, successUrl, cancelUrl, metadata);
          return { checkoutUrl: res.paymentUrl, provider: 'paytech', transactionRef: res.reference };
        }
        default:
          throw new Error(`Unsupported fallback provider: ${config.fallbackProvider}`);
      }
    }
    
    throw new Error('Payment routing failed and no fallback available.');
  }
};
