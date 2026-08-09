
export interface Country {
  id: string;
  name: string;
  flag: string;
  primaryLanguage: 'French' | 'English' | 'Arabic';
  accentDescription: string;
  geminiVoiceMale?: string;
  geminiVoiceFemale?: string;
}

// ── AI Voice Director Engine: New Types ──────────────────────────

export type AccentLevel = 'light' | 'medium' | 'strong';

export type ContentStyle =
  | 'tiktok' | 'advertisement' | 'storytelling' | 'podcast'
  | 'news' | 'radio' | 'documentary' | 'narration'
  | 'motivation' | 'training' | 'commercial' | 'youtube';

export type VocalPersonality =
  | 'entrepreneur' | 'professor' | 'student' | 'journalist'
  | 'narrator' | 'salesperson' | 'tiktok_creator' | 'influencer'
  | 'ceo' | 'coach' | 'radio_host';

export type VocalObjective =
  | 'inform' | 'convince' | 'inspire' | 'educate'
  | 'entertain' | 'sell' | 'tell_story' | 'motivate';



export interface VoiceSettings {
  gender: 'male' | 'female';
  voiceVariant?: 'voice1' | 'voice2' | 'voice3';
  age: number;
  style: string;
  pitch: number;
  speed: number;
  emotion?: 'neutral' | 'happy' | 'serious' | 'energetic' | 'soft';
  useLocalExpressions?: boolean;
  phoneticHumanizer?: boolean;
  // AI Voice Director Engine additions
  accentLevel?: AccentLevel;
  contentStyle?: ContentStyle;
  personality?: VocalPersonality;
  vocalObjective?: VocalObjective;
}

// ── Voice DNA (per-country vocal identity) ───────────────────────

export interface VoiceDNA {
  countryId: string;
  region: 'West Africa' | 'Central Africa' | 'East Africa' | 'North Africa' | 'Southern Africa';
  capital: string;
  localLanguages: string[];
  speechMelody: string;
  consonantStyle: string;
  rhythmPattern: string;
  culturalContext: string;
  antiPatterns: string[];
  defaultWarmth: number;    // 1-10
  defaultConfidence: number; // 1-10
  defaultEnergy: number;    // 1-10
}

// ── AI Voice Director Decision ───────────────────────────────────

export interface DirectorDecision {
  contentType: ContentStyle;
  energy: number;       // 1-10
  smile: number;        // 1-10
  breathiness: number;  // 1-10
  pauseFrequency: number; // 1-10
  rhythm: 'punchy' | 'flowing' | 'measured' | 'staccato' | 'dramatic';
  intonation: 'ascending' | 'descending' | 'neutral' | 'varied' | 'dramatic';
  confidence: number;
}

// ── Quality Score ────────────────────────────────────────────────

export interface QualityScore {
  overall: number;        // 0-100
  authenticity: number;   // 0-100 — African accent fidelity
  fluidity: number;       // 0-100
  naturalness: number;    // 0-100
  expressiveness: number; // 0-100
  emotionalQuality: number; // 0-100
  countryMatch: number;   // 0-100
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
  qualityScore?: QualityScore | null;
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

export interface VoiceProfile {
  voiceProfileId: string;
  version: string;
  country: string;
  language: string;
  gender: 'male' | 'female';
  persona: string;
  masterVoiceSample: string;
  consentAudio?: string;
  consentStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  voiceCloningKey?: string;
  accentProfile: string;
  styleProfile: string;
  basePace: number;
  provider: 'google' | 'gemini_legacy';
  providerModel: string;
}

export interface VoiceGenerationMetadata {
  generationId: string;
  voiceProfileId: string;
  voiceProfileVersion: string;
  provider: string;
  model: string;
  language: string;
  country: string;
  pace: number;
  createdAt: string;
  status: 'VOICE_REPLICATION_SUCCESS' | 'VOICE_REPLICATION_UNAVAILABLE' | 'VOICE_REPLICATION_ERROR' | 'VOICE_FALLBACK_USED';
}

