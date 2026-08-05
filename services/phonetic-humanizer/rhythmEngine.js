// ──────────────────────────────────────────────────────────────
// PhoneticHumanizer — Rhythm Engine (pure JS)
// ──────────────────────────────────────────────────────────────

const FRENCH_PAUSE_TRIGGERS = new Set([
  'mais', 'donc', 'alors', 'voilà', 'bon', 'oui', 'non', 'et',
  'parce que', 'c\'est-à-dire', 'en fait', 'justement', 'évidemment',
  'effectivement', 'aujourd\'hui', 'maintenant', 'ensemble',
]);

const ENGLISH_PAUSE_TRIGGERS = new Set([
  'but', 'so', 'now', 'well', 'actually', 'today', 'together',
  'because', 'however', 'therefore', 'indeed', 'absolutely',
  'importantly', 'finally', 'remember',
]);

/**
 * Determines how many rhythm modifications to apply.
 * @param {number} textLength
 * @param {number} pauseWeight
 * @param {string} [contentStyle]
 * @returns {number}
 */
function getModificationBudget(textLength, pauseWeight, contentStyle) {
  const baseBudget = Math.max(1, Math.floor(textLength / 80));
  const scaledBudget = Math.round(baseBudget * (pauseWeight / 3));

  if (contentStyle === 'news' || contentStyle === 'training') {
    return Math.max(1, Math.floor(scaledBudget * 0.5));
  }
  if (contentStyle === 'storytelling' || contentStyle === 'podcast') {
    return Math.round(scaledBudget * 1.3);
  }
  if (contentStyle === 'tiktok' || contentStyle === 'advertisement') {
    return Math.round(scaledBudget * 0.7);
  }

  return scaledBudget;
}

/**
 * Humanizes sentence endings.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @returns {string}
 */
function humanizeSentenceEndings(text, profile) {
  let modCount = 0;
  const maxMods = Math.max(1, Math.floor(text.length / 200));

  return text.replace(/([^.!?…])\.(\s|$)/g, (match, before, after, offset) => {
    if (modCount >= maxMods) return match;

    const precedingChars = text.substring(Math.max(0, offset - 3), offset + 1);
    if (/\b[A-Z][a-z]?\.$/.test(precedingChars)) return match;

    if (profile.rhythmStyle === 'flowing' || profile.rhythmStyle === 'syncopated') {
      if (modCount % 2 === 0) {
        modCount++;
        return `${before}...${after}`;
      }
    }
    if (profile.rhythmStyle === 'dramatic') {
      modCount++;
      return `${before}...${after}`;
    }

    return match;
  });
}

/**
 * Adds breathing pauses.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @param {number} budget
 * @returns {string}
 */
function addBreathingPauses(text, profile, budget) {
  const pauseTriggers = profile.language === 'en' ? ENGLISH_PAUSE_TRIGGERS : FRENCH_PAUSE_TRIGGERS;
  let modsApplied = 0;

  const words = text.split(/(\s+)/);
  const result = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const lowerWord = word.toLowerCase().replace(/[,;:!?.…]/g, '');

    if (modsApplied < budget && pauseTriggers.has(lowerWord) && i > 2) {
      const prev = result[result.length - 1] || '';
      if (prev && !/[,;:!?.…—\-]$/.test(prev.trim())) {
        result.push(', ');
        modsApplied++;
      }
    }

    result.push(word);
  }

  return result.join('');
}

/**
 * Applies rhythmic modifications to the script.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @param {string} [contentStyle]
 * @returns {string}
 */
export function applyRhythmPatterns(text, profile, contentStyle) {
  if (!text || !text.trim()) return text;

  const budget = getModificationBudget(text.length, profile.pauseWeight || 3, contentStyle);

  let result = text;
  result = humanizeSentenceEndings(result, profile);
  result = addBreathingPauses(result, profile, budget);

  return result;
}
