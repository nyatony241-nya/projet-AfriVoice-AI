// ──────────────────────────────────────────────────────────────
// PhoneticHumanizer — Vowel Stretch Engine (pure JS)
// ──────────────────────────────────────────────────────────────

/**
 * Splits text into sentences.
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  return text.split(/(?<=[.!?\n])\s+/).filter(s => s.trim().length > 0);
}

/**
 * Checks if a word should be protected from stretching.
 * @param {string} word
 * @param {boolean} isFirstWord
 * @returns {boolean}
 */
function isProtectedWord(word, isFirstWord) {
  if (/([aeiouàâéèêëïîôùûüy])\1{2,}/i.test(word)) return true;
  if (/^[A-ZÀÂÉÈÊËÏÎÔÙÛÜ]{2,}$/.test(word)) return true;
  if (/\d/.test(word)) return true;
  if (/[@:/.]/.test(word)) return true;
  if (!isFirstWord && /^[A-ZÀÂÉÈÊËÏÎÔÙÛÜ]/.test(word)) return true;
  if (word.replace(/[^a-zàâéèêëïîôùûüçñ]/gi, '').length < 3) return true;
  return false;
}

/**
 * Applies vowel stretching to a single sentence.
 * @param {string} sentence
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @returns {string}
 */
function stretchSentence(sentence, profile) {
  let stretchCount = 0;
  const maxStretches = profile.maxStretchesPerSentence || 2;

  const tokens = sentence.split(/(\s+|[,;:!?.…—–\-"""''()[\]{}])/);

  const result = tokens.map((token, index) => {
    if (/^[\s,;:!?.…—–\-"""''()[\]{}]*$/.test(token)) return token;
    if (stretchCount >= maxStretches) return token;

    const isFirstWord = index === 0 || tokens.slice(0, index).every(t => /^\s*$/.test(t));
    if (isProtectedWord(token, isFirstWord)) return token;

    const lowerToken = token.toLowerCase();
    const stretchedForm = profile.vowelStretchTargets[lowerToken];

    if (stretchedForm) {
      stretchCount++;
      if (token[0] === token[0].toUpperCase() && token.length > 1) {
        return stretchedForm[0].toUpperCase() + stretchedForm.slice(1);
      }
      return stretchedForm;
    }

    return token;
  });

  return result.join('');
}

/**
 * Applies vowel stretching to the entire script.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @returns {string}
 */
export function applyVowelStretching(text, profile) {
  if (!text || !text.trim()) return text;
  if (profile.stretchIntensity === 0) return text;

  const sentences = splitSentences(text);
  return sentences.map(sentence => stretchSentence(sentence, profile)).join(' ');
}
