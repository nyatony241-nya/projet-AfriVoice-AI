// ──────────────────────────────────────────────────────────────
// PhoneticHumanizer — Country Speech Profiles
// 20 African countries × linguistic fingerprints (pure JS)
// ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CountrySpeechProfile
 * @property {string} countryId
 * @property {'fr' | 'en' | 'ar'} language
 * @property {Record<string, string>} vowelStretchTargets
 * @property {number} stretchIntensity
 * @property {number} maxStretchesPerSentence
 * @property {'syncopated' | 'flowing' | 'staccato' | 'measured' | 'dramatic'} rhythmStyle
 * @property {number} pauseWeight
 * @property {string[]} interjections
 * @property {string[]} openers
 * @property {'warm' | 'energetic' | 'calm' | 'serious' | 'dramatic'} emotionBias
 * @property {string[]} preferredEmotionTags
 */

/** @type {Record<string, CountrySpeechProfile>} */
const PROFILES = {
  CI: {
    countryId: 'CI',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'bonjour': 'bonjouur',
      'ensemble': 'enseeemble',
      'incroyable': 'incrooyable',
      'formidable': 'formidaable',
      'magnifique': 'magnifiique',
      'bienvenue': 'bienvenuue',
      'abidjan': 'abidjaan',
      'génial': 'géniaal',
      'super': 'suuper',
      'parfait': 'parfaait',
      'exactement': 'exactemeent',
      'naturellement': 'naturellemeeent',
      'absolument': 'absolumeeent',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 3,
    rhythmStyle: 'syncopated',
    pauseWeight: 3,
    interjections: ['dêh', 'oh', 'eh', 'ah bon', 'walahi'],
    openers: ['Bon...', 'Hmm...', 'Eh...', 'Ah...'],
    emotionBias: 'warm',
    preferredEmotionTags: ['[warm smile]', '[chuckle]', '[laughs softly]'],
  },

  SN: {
    countryId: 'SN',
    language: 'fr',
    vowelStretchTargets: {
      'merci': 'meerci',
      'bienvenue': 'bienvenuue',
      'ensemble': 'enseeemble',
      'magnifique': 'magnifiique',
      'dakar': 'dakaar',
      'important': 'importaant',
      'exactement': 'exactemeeent',
      'tranquille': 'tranquiille',
      'parfait': 'parfaait',
      'famille': 'famiille',
      'teranga': 'teraanga',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'flowing',
    pauseWeight: 2,
    interjections: ['ndéysan', 'inchallah', 'voilà'],
    openers: ['Voilà...', 'Bon...', 'Eh bien...'],
    emotionBias: 'calm',
    preferredEmotionTags: ['[warm smile]', '[sighs contentedly]'],
  },

  CM: {
    countryId: 'CM',
    language: 'fr',
    vowelStretchTargets: {
      'attention': 'attentioon',
      'vraiment': 'vraimeeent',
      'important': 'importaant',
      'absolument': 'absolumeeent',
      'cameroun': 'camerouun',
      'douala': 'douaala',
      'yaoundé': 'yaoundée',
      'formidable': 'formidaable',
      'excellent': 'excelleent',
      'sérieux': 'sérieeux',
      'problème': 'problèème',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'measured',
    pauseWeight: 3,
    interjections: ['c\'est ça même', 'tu vois non', 'wèè'],
    openers: ['Eh bien...', 'Bon...', 'Voilà...'],
    emotionBias: 'serious',
    preferredEmotionTags: ['[clears throat]', '[warm smile]'],
  },

  BJ: {
    countryId: 'BJ',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'bonjour': 'bonjouur',
      'important': 'importaant',
      'ensemble': 'enseeemble',
      'cotonou': 'cotonouuu',
      'formidable': 'formidaable',
      'absolument': 'absolumeeent',
      'magnifique': 'magnifiique',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'measured',
    pauseWeight: 3,
    interjections: ['kpèkpè', 'azô', 'ah bon'],
    openers: ['Bon...', 'Eh...', 'Voilà...'],
    emotionBias: 'warm',
    preferredEmotionTags: ['[warm smile]', '[sighs]'],
  },

  BF: {
    countryId: 'BF',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'ensemble': 'enseeemble',
      'important': 'importaant',
      'absolument': 'absolumeeent',
      'ouagadougou': 'ouagadouugou',
      'tranquille': 'tranquiille',
      'naturellement': 'naturellemeeent',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'measured',
    pauseWeight: 2,
    interjections: ['bon', 'en tout cas', 'c\'est sûr'],
    openers: ['Bon...', 'En tout cas...', 'Voilà...'],
    emotionBias: 'calm',
    preferredEmotionTags: ['[warm smile]', '[sighs contentedly]'],
  },

  ML: {
    countryId: 'ML',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'bonjour': 'bonjouur',
      'bamako': 'bamaako',
      'ensemble': 'enseeemble',
      'formidable': 'formidaable',
      'magnifique': 'magnifiique',
      'important': 'importaant',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'flowing',
    pauseWeight: 3,
    interjections: ['wallahi', 'voilà', 'bon'],
    openers: ['Voilà...', 'Bon...', 'Hmm...'],
    emotionBias: 'calm',
    preferredEmotionTags: ['[warm smile]', '[sighs]'],
  },

  TG: {
    countryId: 'TG',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'bonjour': 'bonjouur',
      'lomé': 'loméé',
      'ensemble': 'enseeemble',
      'formidable': 'formidaable',
      'magnifique': 'magnifiique',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'syncopated',
    pauseWeight: 3,
    interjections: ['éfè', 'n\'est-ce pas', 'yoo'],
    openers: ['Eh...', 'Bon...', 'Voilà...'],
    emotionBias: 'warm',
    preferredEmotionTags: ['[warm smile]', '[chuckle]'],
  },

  CD: {
    countryId: 'CD',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'formidable': 'formidaable',
      'kinshasa': 'kinshaasa',
      'musique': 'musiique',
      'magnifique': 'magnifiique',
      'incroyable': 'incrooyable',
      'super': 'suuper',
      'génial': 'géniaal',
      'ambiance': 'ambiiance',
      'ensemble': 'enseeemble',
      'bienvenue': 'bienvenuue',
      'extraordinaire': 'extraordinaiire',
    },
    stretchIntensity: 3,
    maxStretchesPerSentence: 3,
    rhythmStyle: 'syncopated',
    pauseWeight: 4,
    interjections: ['yo', 'eh eh', 'ah', 'pona nini'],
    openers: ['Eh eh...', 'Ah...', 'Bon...', 'Yo...'],
    emotionBias: 'energetic',
    preferredEmotionTags: ['[laughs softly]', '[warm smile]', '[excited]', '[chuckle]'],
  },

  CG: {
    countryId: 'CG',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'formidable': 'formidaable',
      'brazzaville': 'brazzaviille',
      'magnifique': 'magnifiique',
      'ensemble': 'enseeemble',
      'élégant': 'éléegant',
      'extraordinaire': 'extraordinaiire',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'flowing',
    pauseWeight: 2,
    interjections: ['eh bien', 'c\'est ça', 'voilà'],
    openers: ['Eh bien...', 'Voilà...', 'Bon...'],
    emotionBias: 'calm',
    preferredEmotionTags: ['[warm smile]', '[sighs contentedly]'],
  },

  GA: {
    countryId: 'GA',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'bonjour': 'bonjouur',
      'libreville': 'libreviille',
      'formidable': 'formidaable',
      'magnifique': 'magnifiique',
      'ensemble': 'enseeemble',
      'tranquille': 'tranquiille',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'flowing',
    pauseWeight: 2,
    interjections: ['disons', 'non mais', 'ah bon'],
    openers: ['Disons...', 'Bon...', 'Voilà...'],
    emotionBias: 'calm',
    preferredEmotionTags: ['[warm smile]', '[sighs contentedly]'],
  },

  NG: {
    countryId: 'NG',
    language: 'en',
    vowelStretchTargets: {
      'amazing': 'amaazing',
      'people': 'peeople',
      'beautiful': 'beauutiful',
      'welcome': 'weelcome',
      'incredible': 'increedible',
      'wonderful': 'woonderful',
      'fantastic': 'fantaastic',
      'important': 'importaant',
      'lagos': 'laagos',
      'nigeria': 'nigeeria',
      'serious': 'seeerious',
      'absolutely': 'absoltuely',
      'powerful': 'poowerful',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'staccato',
    pauseWeight: 3,
    interjections: ['ehn', 'you know', 'I tell you', 'my brother'],
    openers: ['Look...', 'See...', 'You know...', 'Ehn...'],
    emotionBias: 'energetic',
    preferredEmotionTags: ['[laughs]', '[excited]', '[clears throat]'],
  },

  GH: {
    countryId: 'GH',
    language: 'en',
    vowelStretchTargets: {
      'welcome': 'weelcome',
      'beautiful': 'beauutiful',
      'amazing': 'amaazing',
      'wonderful': 'woonderful',
      'important': 'importaant',
      'accra': 'aaccra',
      'ghana': 'ghaana',
      'incredible': 'increedible',
      'excellent': 'exceellent',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'measured',
    pauseWeight: 2,
    interjections: ['chale', 'you see', 'ei'],
    openers: ['So...', 'Well...', 'You see...'],
    emotionBias: 'warm',
    preferredEmotionTags: ['[warm smile]', '[chuckle]'],
  },

  KE: {
    countryId: 'KE',
    language: 'en',
    vowelStretchTargets: {
      'welcome': 'weelcome',
      'beautiful': 'beauutiful',
      'amazing': 'amaazing',
      'important': 'importaant',
      'nairobi': 'nairoobi',
      'kenya': 'keenya',
      'incredible': 'increedible',
      'wonderful': 'woonderful',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'measured',
    pauseWeight: 2,
    interjections: ['si you know', 'ati', 'aki'],
    openers: ['So...', 'Look...', 'You know...'],
    emotionBias: 'warm',
    preferredEmotionTags: ['[warm smile]', '[chuckle]'],
  },

  ZA: {
    countryId: 'ZA',
    language: 'en',
    vowelStretchTargets: {
      'amazing': 'amaazing',
      'beautiful': 'beauutiful',
      'incredible': 'increedible',
      'johannesburg': 'johanneesburg',
      'important': 'importaant',
      'fantastic': 'fantaastic',
      'wonderful': 'woonderful',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'staccato',
    pauseWeight: 3,
    interjections: ['shame', 'just now', 'eish'],
    openers: ['Look...', 'So...', 'Eish...'],
    emotionBias: 'energetic',
    preferredEmotionTags: ['[laughs]', '[chuckle]', '[excited]'],
  },

  UG: {
    countryId: 'UG',
    language: 'en',
    vowelStretchTargets: {
      'welcome': 'weelcome',
      'beautiful': 'beauutiful',
      'amazing': 'amaazing',
      'kampala': 'kampaala',
      'important': 'importaant',
      'wonderful': 'woonderful',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'flowing',
    pauseWeight: 2,
    interjections: ['banange', 'actually', 'bambi'],
    openers: ['So...', 'You know...', 'Well...'],
    emotionBias: 'warm',
    preferredEmotionTags: ['[warm smile]', '[sighs contentedly]'],
  },

  TZ: {
    countryId: 'TZ',
    language: 'en',
    vowelStretchTargets: {
      'welcome': 'weelcome',
      'beautiful': 'beauutiful',
      'amazing': 'amaazing',
      'important': 'importaant',
      'wonderful': 'woonderful',
      'karibu': 'kariibuu',
    },
    stretchIntensity: 1,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'flowing',
    pauseWeight: 2,
    interjections: ['sawa sawa', 'kweli', 'basi'],
    openers: ['So...', 'Well...', 'You know...'],
    emotionBias: 'calm',
    preferredEmotionTags: ['[warm smile]', '[sighs contentedly]'],
  },

  MA: {
    countryId: 'MA',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'magnifique': 'magnifiique',
      'casablanca': 'casablaanca',
      'maroc': 'maaroc',
      'formidable': 'formidaable',
      'important': 'importaant',
      'exactement': 'exactemeeent',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'staccato',
    pauseWeight: 3,
    interjections: ['wallah', 'yak', 'safi'],
    openers: ['Bon...', 'Voilà...', 'Eh...'],
    emotionBias: 'energetic',
    preferredEmotionTags: ['[warm smile]', '[laughs]', '[excited]'],
  },

  TN: {
    countryId: 'TN',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'magnifique': 'magnifiique',
      'formidable': 'formidaable',
      'important': 'importaant',
      'tunis': 'tuunis',
      'ensemble': 'enseeemble',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'staccato',
    pauseWeight: 3,
    interjections: ['barcha', 'ya3ni', 'wallahi'],
    openers: ['Bon...', 'Voilà...', 'Eh...'],
    emotionBias: 'energetic',
    preferredEmotionTags: ['[warm smile]', '[excited]'],
  },

  DZ: {
    countryId: 'DZ',
    language: 'fr',
    vowelStretchTargets: {
      'vraiment': 'vraaiiment',
      'merci': 'meerci',
      'magnifique': 'magnifiique',
      'formidable': 'formidaable',
      'important': 'importaant',
      'alger': 'aalger',
      'absolument': 'absolumeeent',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'dramatic',
    pauseWeight: 4,
    interjections: ['bezaf', 'saha', 'wallah'],
    openers: ['Bon...', 'Voilà...', 'Eh...'],
    emotionBias: 'dramatic',
    preferredEmotionTags: ['[clears throat]', '[sighs]', '[warm smile]'],
  },

  EG: {
    countryId: 'EG',
    language: 'en',
    vowelStretchTargets: {
      'amazing': 'amaazing',
      'beautiful': 'beauutiful',
      'incredible': 'increedible',
      'important': 'importaant',
      'cairo': 'caaiiro',
      'wonderful': 'woonderful',
      'fantastic': 'fantaastic',
    },
    stretchIntensity: 2,
    maxStretchesPerSentence: 2,
    rhythmStyle: 'dramatic',
    pauseWeight: 4,
    interjections: ['ya3ni', 'tab3an', 'wallahi'],
    openers: ['Look...', 'So...', 'You know...'],
    emotionBias: 'dramatic',
    preferredEmotionTags: ['[laughs]', '[warm smile]', '[sighs]'],
  },
};

/**
 * Returns the speech profile for a given country.
 * @param {string} countryId
 * @param {'fr' | 'en' | 'ar'} [detectedLanguage]
 * @returns {CountrySpeechProfile | null}
 */
export function getProfile(countryId, detectedLanguage) {
  if (!countryId) return null;
  const id = countryId.toUpperCase();
  if (PROFILES[id]) return PROFILES[id];

  if (detectedLanguage === 'en') return PROFILES['NG'];
  if (detectedLanguage === 'ar') return PROFILES['MA'];
  return PROFILES['CI'];
}

/**
 * Returns all available country IDs with profiles.
 * @returns {string[]}
 */
export function getAvailableCountryIds() {
  return Object.keys(PROFILES);
}
