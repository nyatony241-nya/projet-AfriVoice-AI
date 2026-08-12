import { CountryPaymentConfig, PaymentProvider, PaymentMethod } from '../types';

export const CHARIOW_PRODUCTS = {
  starter: { id: 'prd_n6d89d8s', priceXOF: 1900 },
  creator: { id: 'prd_f639rpw2', priceXOF: 4900 },
  pro:     { id: 'prd_pq817d6j', priceXOF: 8900 },
} as const;

export const countryPaymentConfigs: Record<string, CountryPaymentConfig> = {
  NG: {
    countryId: 'NG',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['OPay', 'MTN MoMo'],
    currency: 'NGN',
    currencySymbol: '₦',
    fallbackProvider: 'paystack'
  },
  CI: {
    countryId: 'CI',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Orange Money', 'MTN MoMo', 'Wave', 'Moov'],
    currency: 'XOF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'paystack'
  },
  CM: {
    countryId: 'CM',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Orange Money', 'MTN MoMo'],
    currency: 'XAF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'pawapay'
  },
  SN: {
    countryId: 'SN',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Orange Money', 'Wave', 'Free Money'],
    currency: 'XOF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'paytech'
  },
  CG: {
    countryId: 'CG',
    primaryProvider: 'chariow',
    cardAvailable: false,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Airtel Money', 'MTN MoMo'],
    currency: 'XAF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'pawapay'
  },
  GH: {
    countryId: 'GH',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['MTN MoMo', 'Vodafone Cash'],
    currency: 'GHS',
    currencySymbol: 'GH₵',
    fallbackProvider: 'paystack'
  },
  MA: {
    countryId: 'MA',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: false,
    mobileMoneyOperators: [],
    currency: 'MAD',
    currencySymbol: 'DH',
    fallbackProvider: 'flutterwave'
  },
  ZA: {
    countryId: 'ZA',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: false,
    mobileMoneyOperators: [],
    currency: 'ZAR',
    currencySymbol: 'R',
    fallbackProvider: 'paystack'
  },
  KE: {
    countryId: 'KE',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['M-Pesa', 'Airtel Money'],
    currency: 'KES',
    currencySymbol: 'KSh',
    fallbackProvider: 'paystack'
  },
  GA: {
    countryId: 'GA',
    primaryProvider: 'chariow',
    cardAvailable: false,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Airtel Money'],
    currency: 'XAF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'pawapay'
  },
  BJ: {
    countryId: 'BJ',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['MTN MoMo', 'Moov Money'],
    currency: 'XOF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'pawapay'
  },
  BF: {
    countryId: 'BF',
    primaryProvider: 'chariow',
    cardAvailable: false,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Orange Money', 'Moov Money'],
    currency: 'XOF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'pawapay'
  },
  ML: {
    countryId: 'ML',
    primaryProvider: 'chariow',
    cardAvailable: false,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Orange Money', 'Moov Money'],
    currency: 'XOF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'pawapay'
  },
  TG: {
    countryId: 'TG',
    primaryProvider: 'chariow',
    cardAvailable: false,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['T-Money', 'Flooz'],
    currency: 'XOF',
    currencySymbol: 'FCFA',
    fallbackProvider: 'flutterwave'
  },
  TN: {
    countryId: 'TN',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: false,
    mobileMoneyOperators: [],
    currency: 'TND',
    currencySymbol: 'DT',
    fallbackProvider: 'flutterwave'
  },
  DZ: {
    countryId: 'DZ',
    primaryProvider: 'chariow',
    cardAvailable: false,
    mobileMoneyAvailable: false,
    mobileMoneyOperators: [],
    currency: 'DZD',
    currencySymbol: 'DA',
    fallbackProvider: 'flutterwave'
  },
  EG: {
    countryId: 'EG',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['Vodafone Cash'],
    currency: 'EGP',
    currencySymbol: 'E£',
    fallbackProvider: 'flutterwave'
  },
  UG: {
    countryId: 'UG',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['MTN MoMo', 'Airtel Money'],
    currency: 'UGX',
    currencySymbol: 'USh',
    fallbackProvider: 'pawapay'
  },
  TZ: {
    countryId: 'TZ',
    primaryProvider: 'chariow',
    cardAvailable: true,
    mobileMoneyAvailable: true,
    mobileMoneyOperators: ['M-Pesa', 'Tigo Pesa'],
    currency: 'TZS',
    currencySymbol: 'TSh',
    fallbackProvider: 'pawapay'
  }
};

export function getPaymentConfigForCountry(countryId: string): CountryPaymentConfig | undefined {
  return countryPaymentConfigs[countryId];
}

export function getAvailablePaymentMethods(countryId: string): PaymentMethod[] {
  const config = getPaymentConfigForCountry(countryId);
  if (!config) return [];
  
  const methods: PaymentMethod[] = [];
  if (config.cardAvailable) methods.push('card');
  if (config.mobileMoneyAvailable) methods.push('mobile_money');
  
  return methods;
}

export function getMobileMoneyOperators(countryId: string): string[] {
  const config = getPaymentConfigForCountry(countryId);
  return config ? config.mobileMoneyOperators : [];
}
