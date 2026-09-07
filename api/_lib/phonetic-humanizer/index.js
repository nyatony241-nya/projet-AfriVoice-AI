// ══════════════════════════════════════════════════════════════
// PhoneticHumanizer — Pipeline Orchestrator (pure JS)
// ══════════════════════════════════════════════════════════════

import { detectLanguage } from './languageDetector.js';
import { getProfile } from './profiles.js';
import { applyVowelStretching } from './vowelEngine.js';
import { applyRhythmPatterns } from './rhythmEngine.js';
import { applyEmotionTags } from './emotionEngine.js';

/**
 * Transforms a raw user script into a phonetically enriched version
 * optimized for Gemini TTS to produce authentic African speech.
 *
 * @param {string} script
 * @param {string} countryId
 * @param {Object} [options]
 * @param {string} [options.contentStyle]
 * @param {string} [options.emotion]
 * @returns {string}
 */
export function humanizeScript(script, countryId, options) {
  if (!script || !script.trim()) return script;

  const language = detectLanguage(script);
  const profile = getProfile(countryId, language);
  if (!profile) return script;

  let result = script;

  // 1. Vowel stretching
  result = applyVowelStretching(result, profile);

  // 2. Rhythm engine
  result = applyRhythmPatterns(result, profile, options?.contentStyle);

  // 3. Emotion engine
  result = applyEmotionTags(result, profile, {
    contentStyle: options?.contentStyle,
    emotion: options?.emotion,
  });

  return result;
}

export { detectLanguage } from './languageDetector.js';
export { getProfile, getAvailableCountryIds } from './profiles.js';
