import { validateLicense as chariowValidateLicense } from './providers/chariowProvider';
import { LicenseInfo } from '../types';

// In-memory cache for validation results
const licenseCache = new Map<string, { data: LicenseInfo; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const validateUserLicense = async (licenseKey: string): Promise<LicenseInfo> => {
  const cached = licenseCache.get(licenseKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const result = await chariowValidateLicense(licenseKey);
  
  // Update cache
  licenseCache.set(licenseKey, { data: result, timestamp: Date.now() });
  
  return result;
};

export const getQuotaForPlan = (planId: 'free' | 'creator' | 'pro') => {
  switch (planId) {
    case 'free':
      return { maxSeconds: 300, maxCharsPerScript: 1000 };
    case 'creator':
      return { maxSeconds: 3600, maxCharsPerScript: 5000 };
    case 'pro':
      return { maxSeconds: 14400, maxCharsPerScript: 10000 };
    default:
      return { maxSeconds: 300, maxCharsPerScript: 1000 };
  }
};
