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
  
  // Normalize planId if 'starter' is returned
  if ((result.planId as string) === 'starter') {
    result.planId = 'free';
  }
  
  // Update cache
  licenseCache.set(licenseKey, { data: result, timestamp: Date.now() });
  
  return result;
};

export const getQuotaForPlan = (planId: 'free' | 'creator' | 'pro' | string) => {
  const normalizedPlanId = planId === 'starter' ? 'free' : planId;
  switch (normalizedPlanId) {
    case 'free':
      return { maxSeconds: 600, maxCharsPerScript: 500, label: 'STARTER — 10 min/mois' };
    case 'creator':
      return { maxSeconds: 1800, maxCharsPerScript: 1500, label: 'CREATOR — 30 min/mois' };
    case 'pro':
      return { maxSeconds: 3600, maxCharsPerScript: 3000, label: 'PRO STUDIO HD — 60 min/mois' };
    default:
      return { maxSeconds: 600, maxCharsPerScript: 500, label: 'STARTER — 10 min/mois' };
  }
};

export const invalidateLicenseCache = (licenseKey: string) => {
  licenseCache.delete(licenseKey);
};
