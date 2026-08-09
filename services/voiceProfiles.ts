import { VoiceProfile } from '../types';

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  SENEGAL_INFLUENCER_FEMALE_01: {
    voiceProfileId: 'SENEGAL_INFLUENCER_FEMALE_01',
    version: '1.0.0',
    country: 'Senegal',
    language: 'French',
    gender: 'female',
    persona: 'Influencer',
    masterVoiceSample: 'services/voice-profiles/senegal/influencer/female-01/master.wav',
    consentAudio: 'services/voice-profiles/senegal/influencer/female-01/consent.wav',
    consentStatus: 'APPROVED',
    voiceCloningKey: process.env.SENEGAL_INFLUENCER_FEMALE_01_KEY || '',
    accentProfile: 'Senegal',
    styleProfile: 'Influencer',
    basePace: 1.0,
    provider: 'google',
    providerModel: 'chirp-3',
  }
};
