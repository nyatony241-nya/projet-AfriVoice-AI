// ──────────────────────────────────────────────────────────────
// PhoneticHumanizer — Emotion Engine (pure JS)
// ──────────────────────────────────────────────────────────────

const WARM_TAGS = ['[warm smile]', '[sighs contentedly]', '[laughs softly]'];
const ENERGETIC_TAGS = ['[excited]', '[laughs]', '[chuckle]'];
const CALM_TAGS = ['[sighs contentedly]', '[warm smile]'];
const DRAMATIC_TAGS = ['[clears throat]', '[sighs]', '[whisper]'];
const SERIOUS_TAGS = ['[clears throat]'];

const NO_EMOTION_STYLES = new Set(['news']);
const MINIMAL_EMOTION_STYLES = new Set(['training', 'documentary', 'commercial']);
const ENHANCED_EMOTION_STYLES = new Set(['storytelling', 'podcast', 'tiktok', 'motivation', 'youtube']);

const FRENCH_EMOTION_TRIGGERS = {
  joy: ['magnifique', 'formidable', 'génial', 'super', 'incroyable', 'bravo', 'fantastique', 'extraordinaire', 'merveilleux'],
  emphasis: ['vraiment', 'absolument', 'exactement', 'effectivement', 'justement', 'évidemment', 'certainement'],
  surprise: ['incroyable', 'inouï', 'impressionnant', 'étonnant'],
  warmth: ['bienvenue', 'merci', 'bonjour', 'ensemble', 'famille', 'amour', 'cœur'],
};

const ENGLISH_EMOTION_TRIGGERS = {
  joy: ['amazing', 'wonderful', 'incredible', 'fantastic', 'brilliant', 'outstanding', 'awesome', 'beautiful'],
  emphasis: ['absolutely', 'definitely', 'exactly', 'certainly', 'truly', 'really', 'seriously'],
  surprise: ['incredible', 'unbelievable', 'shocking', 'stunning'],
  warmth: ['welcome', 'thank', 'together', 'family', 'love', 'heart', 'grateful'],
};

/**
 * Determines the emotion budget.
 * @param {number} textLength
 * @param {string} [contentStyle]
 * @returns {number}
 */
function getEmotionBudget(textLength, contentStyle) {
  const base = Math.max(1, Math.min(4, Math.floor(textLength / 400)));

  if (contentStyle && NO_EMOTION_STYLES.has(contentStyle)) return 0;
  if (contentStyle && MINIMAL_EMOTION_STYLES.has(contentStyle)) return Math.max(1, Math.floor(base * 0.5));
  if (contentStyle && ENHANCED_EMOTION_STYLES.has(contentStyle)) return Math.min(4, Math.ceil(base * 1.5));

  return base;
}

/**
 * Selects an emotion tag.
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @param {string} [emotion]
 * @param {number} [rotationIndex]
 * @returns {string}
 */
function selectTag(profile, emotion, rotationIndex = 0) {
  if (emotion === 'happy' || emotion === 'energetic') {
    const tags = ENERGETIC_TAGS;
    return tags[rotationIndex % tags.length];
  }
  if (emotion === 'serious') {
    const tags = SERIOUS_TAGS;
    return tags[rotationIndex % tags.length];
  }
  if (emotion === 'soft') {
    const tags = CALM_TAGS;
    return tags[rotationIndex % tags.length];
  }

  const tags = profile.preferredEmotionTags;
  if (tags && tags.length > 0) return tags[rotationIndex % tags.length];

  const biasMap = {
    warm: WARM_TAGS,
    energetic: ENERGETIC_TAGS,
    calm: CALM_TAGS,
    serious: SERIOUS_TAGS,
    dramatic: DRAMATIC_TAGS,
  };
  const fallback = biasMap[profile.emotionBias] || WARM_TAGS;
  return fallback[rotationIndex % fallback.length];
}

/**
 * Finds insertion points.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @returns {number[]}
 */
function findInsertionPoints(text, profile) {
  const triggers = profile.language === 'en' ? ENGLISH_EMOTION_TRIGGERS : FRENCH_EMOTION_TRIGGERS;
  const positions = [];
  const lowerText = text.toLowerCase();

  for (const category of Object.values(triggers)) {
    for (const word of category) {
      const idx = lowerText.indexOf(word);
      if (idx > 0) {
        const spaceIdx = text.lastIndexOf(' ', idx);
        if (spaceIdx > 0) {
          positions.push({ index: spaceIdx + 1, priority: 1 });
        }
      }
    }
  }

  const sentenceBreaks = [...text.matchAll(/[.!?…]\s+/g)];
  for (const match of sentenceBreaks) {
    if (match.index !== undefined) {
      positions.push({ index: match.index + match[0].length, priority: 2 });
    }
  }

  positions.sort((a, b) => a.priority - b.priority || a.index - b.index);

  const filtered = [];
  for (const pos of positions) {
    if (filtered.every(existing => Math.abs(existing - pos.index) > 100)) {
      filtered.push(pos.index);
    }
  }

  return filtered;
}

/**
 * Maybe adds an opener.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @returns {string}
 */
function maybeAddOpener(text, profile) {
  if (!profile.openers || profile.openers.length === 0) return text;
  
  const lowerStart = text.trim().toLowerCase().substring(0, 20);
  const alreadyHasOpener = profile.openers.some(o => lowerStart.startsWith(o.toLowerCase().replace('...', '')));
  if (alreadyHasOpener) return text;

  if (text.trim().startsWith('[')) return text;

  const seed = text.length % 2;
  if (seed === 0 && profile.openers.length > 0) {
    const opener = profile.openers[text.length % profile.openers.length];
    return `${opener} ${text.trim()}`;
  }

  return text;
}

/**
 * Applies emotion tags.
 * @param {string} text
 * @param {import('./profiles').CountrySpeechProfile} profile
 * @param {Object} [options]
 * @param {string} [options.contentStyle]
 * @param {string} [options.emotion]
 * @returns {string}
 */
export function applyEmotionTags(text, profile, options) {
  if (!text || !text.trim()) return text;

  const budget = getEmotionBudget(text.length, options?.contentStyle);
  if (budget === 0) return text;

  let result = text;
  result = maybeAddOpener(result, profile);

  const insertionPoints = findInsertionPoints(result, profile);
  const tagsToInsert = Math.min(budget, insertionPoints.length);

  if (tagsToInsert === 0) return result;

  const selectedPoints = insertionPoints.slice(0, tagsToInsert);
  selectedPoints.sort((a, b) => b - a);

  for (let i = 0; i < selectedPoints.length; i++) {
    const pos = selectedPoints[i];
    const tag = selectTag(profile, options?.emotion, i);
    result = result.substring(0, pos) + tag + ' ' + result.substring(pos);
  }

  return result;
}
