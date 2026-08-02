import { QualityScore } from '../types';

/**
 * Evaluates a generated voice audio heuristicially based on script and generation metadata.
 * 
 * @param script The text script spoken.
 * @param countryId The country code or ID for the chosen voice.
 * @param accentLevel The requested accent level (e.g., 'light', 'medium', 'strong').
 * @param contentStyle The designated content style for the generation.
 * @param emotion The requested emotion.
 * @param audioDurationSeconds The duration of the resulting audio in seconds.
 * @returns A QualityScore object estimating the quality of the generated voice.
 */
export function analyzeQuality(
  script: string,
  countryId: string,
  accentLevel: string,
  contentStyle: string,
  emotion: string,
  audioDurationSeconds: number
): QualityScore {
  // Estimate words per minute (WPM)
  const wordCount = script.trim().split(/\s+/).length;
  const wordsPerMinute = audioDurationSeconds > 0 ? (wordCount / audioDurationSeconds) * 60 : 150;
  
  let authenticity = 70; // Baseline
  if (['medium', 'strong'].includes(accentLevel.toLowerCase())) authenticity += 15;
  // Assume generic high match for African countries as per constraints
  authenticity += 10; 
  
  let fluidity = 80; // Baseline
  if (wordsPerMinute >= 120 && wordsPerMinute <= 160) {
    fluidity += 15; // Optimal pacing
  } else if (wordsPerMinute > 100 && wordsPerMinute < 180) {
    fluidity += 5; // Acceptable pacing
  } else {
    fluidity -= 10; // Poor pacing
  }
  
  let naturalness = 75; // Assumes humanizer was applied
  if (emotion && emotion.toLowerCase() !== 'neutral') naturalness += 15;
  
  let expressiveness = 60;
  if (['advertisement', 'tiktok', 'motivation', 'podcast'].includes(contentStyle.toLowerCase())) {
    expressiveness += 20;
  }
  if (emotion && emotion.toLowerCase() !== 'neutral') {
    expressiveness += 15;
  }
  
  let emotionalQuality = 60;
  if (emotion && emotion.toLowerCase() !== 'neutral') {
    emotionalQuality += 35;
  }
  
  let countryMatch = 90; // Always high for African countries

  // Clamp helper function
  const clamp = (val: number) => Math.min(100, Math.max(0, val));

  authenticity = clamp(authenticity);
  fluidity = clamp(fluidity);
  naturalness = clamp(naturalness);
  expressiveness = clamp(expressiveness);
  emotionalQuality = clamp(emotionalQuality);
  countryMatch = clamp(countryMatch);
  
  const overall = Math.round(
    (authenticity * 0.2) +
    (fluidity * 0.15) +
    (naturalness * 0.2) +
    (expressiveness * 0.15) +
    (emotionalQuality * 0.15) +
    (countryMatch * 0.15)
  );
  
  return {
    overall,
    authenticity,
    fluidity,
    naturalness,
    expressiveness,
    emotionalQuality,
    countryMatch
  };
}
