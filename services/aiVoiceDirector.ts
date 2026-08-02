import { DirectorDecision, ContentStyle } from '../types';

/**
 * Mapping of ContentStyle to predefined DirectorDecision settings.
 */
const PRESETS: Record<ContentStyle, DirectorDecision> = {
  advertisement: { contentType: 'advertisement', energy: 9, smile: 8, breathiness: 4, pauseFrequency: 5, rhythm: 'punchy', intonation: 'ascending', confidence: 9 },
  tiktok: { contentType: 'tiktok', energy: 10, smile: 9, breathiness: 3, pauseFrequency: 4, rhythm: 'punchy', intonation: 'varied', confidence: 9 },
  podcast: { contentType: 'podcast', energy: 6, smile: 6, breathiness: 6, pauseFrequency: 7, rhythm: 'flowing', intonation: 'varied', confidence: 8 },
  news: { contentType: 'news', energy: 7, smile: 2, breathiness: 5, pauseFrequency: 6, rhythm: 'measured', intonation: 'descending', confidence: 10 },
  storytelling: { contentType: 'storytelling', energy: 5, smile: 5, breathiness: 7, pauseFrequency: 9, rhythm: 'flowing', intonation: 'dramatic', confidence: 7 },
  documentary: { contentType: 'documentary', energy: 4, smile: 2, breathiness: 8, pauseFrequency: 8, rhythm: 'measured', intonation: 'descending', confidence: 8 },
  motivation: { contentType: 'motivation', energy: 9, smile: 5, breathiness: 6, pauseFrequency: 8, rhythm: 'punchy', intonation: 'ascending', confidence: 10 },
  youtube: { contentType: 'youtube', energy: 8, smile: 8, breathiness: 5, pauseFrequency: 6, rhythm: 'punchy', intonation: 'varied', confidence: 9 },
  radio: { contentType: 'radio', energy: 8, smile: 7, breathiness: 5, pauseFrequency: 5, rhythm: 'flowing', intonation: 'varied', confidence: 9 },
  training: { contentType: 'training', energy: 6, smile: 5, breathiness: 5, pauseFrequency: 8, rhythm: 'measured', intonation: 'neutral', confidence: 8 },
  commercial: { contentType: 'commercial', energy: 7, smile: 7, breathiness: 4, pauseFrequency: 6, rhythm: 'punchy', intonation: 'ascending', confidence: 9 },
  narration: { contentType: 'narration', energy: 5, smile: 4, breathiness: 6, pauseFrequency: 7, rhythm: 'flowing', intonation: 'neutral', confidence: 8 }
};

/**
 * Keywords for auto-detecting content type in both French and English.
 */
const KEYWORDS: Record<ContentStyle, string[]> = {
  advertisement: ['promo', 'offre', 'achetez', 'buy', 'limited', 'discount', 'offer', 'soldes', 'remise'],
  tiktok: ['follow', 'like', 'abonnez', 'trending', 'viral', 'tiktok', 'reels'],
  podcast: ['bienvenue', 'épisode', 'welcome to', 'episode', 'podcast', 'auditeurs'],
  news: ['breaking', 'reportage', 'sources', 'information', 'actualité', 'journal'],
  storytelling: ['il était', 'once upon', 'imagine', 'histoire', 'conte'],
  documentary: ['depuis des siècles', 'exploration', 'découverte', 'history', 'civilization'],
  motivation: ['réussite', 'croire', 'believe', 'achieve', 'success', 'courage', 'possible'],
  youtube: ['vidéo', 'chaîne', 'channel', 'subscribe', 'thumbnail'],
  radio: ['fréquence', 'ondes', 'station', 'radio', 'FM'],
  training: ['leçon', 'étape', 'lesson', 'step', 'module', 'formation'],
  commercial: ['entreprise', 'service', 'solution', 'partenaire', 'business'],
  narration: [] // Fallback
};

/**
 * Analyzes the script to determine the best voice direction settings.
 * 
 * @param script The text script to analyze.
 * @param userContentStyle Optional explicit content style chosen by the user.
 * @returns A DirectorDecision object with the recommended voice settings.
 */
export function analyzeScript(script: string, userContentStyle?: ContentStyle): DirectorDecision {
  if (userContentStyle && PRESETS[userContentStyle]) {
    return { ...PRESETS[userContentStyle] };
  }
  
  const lowerScript = script.toLowerCase();
  
  for (const [style, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(kw => lowerScript.includes(kw.toLowerCase()))) {
      return { ...PRESETS[style as ContentStyle] };
    }
  }
  
  // Default fallback
  return { ...PRESETS.narration };
}
