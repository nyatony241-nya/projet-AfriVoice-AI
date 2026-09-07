// ──────────────────────────────────────────────────────────────
// PhoneticHumanizer — Language Detector
// Ultra-lightweight regex-based language detection (< 1ms)
// ──────────────────────────────────────────────────────────────

/**
 * Detects the primary language of a text using characteristic patterns.
 * @param {string} text
 * @returns {'fr' | 'en' | 'ar'}
 */
export function detectLanguage(text) {
  // Arabic Unicode ranges
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicPattern.test(text)) return 'ar';

  // French diacritics and contractions
  const frenchMarkers = /[àâéèêëïîôùûüç]|qu'|l'|d'|n'|j'|c'est|c'était|s'il|j'ai|qu'il|qu'on|aujourd'hui|être|même|très|où|déjà/i;
  const frenchFunctionWords = /\b(nous|vous|leur|cette|avec|dans|pour|sont|mais|donc|alors|aussi|bien|chez|plus|entre|autre|même|tout|sans|depuis)\b/i;

  const frenchScore =
    (frenchMarkers.test(text) ? 3 : 0) +
    (frenchFunctionWords.test(text) ? 2 : 0);

  // English function words
  const englishMarkers = /\b(the|is|are|was|were|have|has|been|will|would|could|should|their|they|them|this|that|these|those|which|about|from|with|your|you're|we're|it's|don't|doesn't|isn't|aren't|can't|won't)\b/i;

  const englishScore = englishMarkers.test(text) ? 3 : 0;

  if (frenchScore > englishScore) return 'fr';
  if (englishScore > 0) return 'en';

  return 'fr'; // Default fallback
}
