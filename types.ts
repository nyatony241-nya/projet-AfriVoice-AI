
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

export interface ExpertSettings {
  city?: string;
  region?: string;
  isUrban?: boolean;
  educationLevel?: 'basic' | 'intermediate' | 'advanced' | 'academic';
  profession?: string;
  socialClass?: 'popular' | 'middle' | 'upper';
  energy?: number;       // 1-10
  expressiveness?: number; // 1-10
  smile?: number;        // 1-10
  breathing?: number;    // 1-10
  presence?: number;     // 1-10
  charisma?: number;     // 1-10
}

export interface VoiceSettings {
  gender: 'male' | 'female';
  voiceVariant?: 'voice1' | 'voice2' | 'voice3';
  age: number;
  style: string;
  pitch: number;
  speed: number;
  emotion?: 'neutral' | 'happy' | 'serious' | 'energetic' | 'soft';
  useLocalExpressions?: boolean;
  isClonedVoice?: boolean;
  clonedVoiceName?: string;
  // AI Voice Director Engine additions
  accentLevel?: AccentLevel;
  contentStyle?: ContentStyle;
  personality?: VocalPersonality;
  vocalObjective?: VocalObjective;
  expertMode?: boolean;
  expertSettings?: ExpertSettings;
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

