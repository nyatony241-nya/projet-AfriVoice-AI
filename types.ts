
export interface Country {
  id: string;
  name: string;
  flag: string;
  primaryLanguage: 'French' | 'English' | 'Arabic';
  accentDescription: string;
}

export interface VoiceSettings {
  gender: 'male' | 'female';
  age: number;
  style: string;
  pitch: number;
  speed: number;
  timbre: number;
  emotion?: 'neutral' | 'happy' | 'serious' | 'energetic' | 'soft';
  useLocalExpressions?: boolean;
  isClonedVoice?: boolean;
  clonedVoiceName?: string;
}

export interface BackgroundMusic {
  id: string;
  name: string;
  url: string;
  previewUrl?: string;
}

export interface MixerSettings {
  voiceVolume: number;
  bgMusicVolume: number;
  bgMusicId: string | null;
  isMixing: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  audioUrl: string | null;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
}

export type Language = 'fr' | 'en';

export interface PricingPlan {
  id: 'free' | 'creator' | 'pro';
  name: string;
  price: string;
  description: string;
  features: string[];
  color: string;
  isPopular?: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  country: Country;
  script: string;
  settings: VoiceSettings;
  audioData: string; // Base64 encoded WAV/Audio
}

export interface QuotaUsage {
  usedSeconds: number;
  maxSeconds: number;
  maxCharsPerScript: number;
  remainingGenerationsToday?: number;
}

