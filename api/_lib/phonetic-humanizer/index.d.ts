// Type definitions for PhoneticHumanizer

export interface HumanizerOptions {
  contentStyle?: string;
  emotion?: string;
}

export interface CountrySpeechProfile {
  countryId: string;
  language: 'fr' | 'en' | 'ar';
  vowelStretchTargets: Record<string, string>;
  stretchIntensity: 1 | 2 | 3;
  maxStretchesPerSentence: number;
  rhythmStyle: 'syncopated' | 'flowing' | 'staccato' | 'measured' | 'dramatic';
  pauseWeight: 1 | 2 | 3 | 4 | 5;
  interjections: string[];
  openers: string[];
  emotionBias: 'warm' | 'energetic' | 'calm' | 'serious' | 'dramatic';
  preferredEmotionTags: string[];
}

export function humanizeScript(
  script: string,
  countryId: string,
  options?: HumanizerOptions
): string;

export function detectLanguage(text: string): 'fr' | 'en' | 'ar';

export function getProfile(
  countryId: string,
  detectedLanguage?: 'fr' | 'en' | 'ar'
): CountrySpeechProfile | null;

export function getAvailableCountryIds(): string[];
