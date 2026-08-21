import { Country, VoiceOption, PricingPlan, BackgroundMusic } from './types';

export const COUNTRIES: Country[] = [
  { id: 'NG', name: 'Nigeria', flag: '🇳🇬', primaryLanguage: 'English', accentDescription: 'Naija English accent. Very rhythmic, confident, heavy emphasis on syllables, distinct Nigerian Pidgin musicality. Do not sound American or British.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CI', name: 'Côte d\u2019Ivoire', flag: '🇨🇮', primaryLanguage: 'French', accentDescription: 'Ivorian French accent (Nouchi vibe). Extremely musical, rolling Rs, punchy and warm intonation, distinct Abidjan street rhythm. Do NOT sound like a Parisian.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CM', name: 'Cameroun', flag: '🇨🇲', primaryLanguage: 'French', accentDescription: 'Cameroonian French accent. Strong, authoritative, guttural Rs, heavy stress on the last syllable of words, vibrant and energetic Duala/Yaoundé rhythm.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'SN', name: 'Sénégal', flag: '🇸🇳', primaryLanguage: 'French', accentDescription: 'Senegalese French accent. Soft, melodic, distinct Wolof influence, rolling Rs, very warm and welcoming Dakar rhythm.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CG', name: 'Congo', flag: '🇨🇬', primaryLanguage: 'French', accentDescription: 'Accent congolais authentique (Brazzaville & Kinshasa). Rythme chantant et mélodieux, influence du Lingala et du Kikongo, intonations chaleureuses, voyelles ouvertes et expressivité unique.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'GH', name: 'Ghana', flag: '🇬🇭', primaryLanguage: 'English', accentDescription: 'Ghanaian English accent. Clear, rhythmic, staccato pronunciation, warm and friendly Accra vibe. Completely different from US/UK English.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'MA', name: 'Maroc', flag: '🇲🇦', primaryLanguage: 'Arabic', accentDescription: 'Moroccan French/Darija accent. Guttural consonants, fast-paced, distinct North African melodic phrasing, rolling Rs.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', primaryLanguage: 'English', accentDescription: 'South African English accent. Distinctive vowel clipping, strong consonants, blend of Afrikaans and Zulu rhythmic influences.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'KE', name: 'Kenya', flag: '🇰🇪', primaryLanguage: 'English', accentDescription: 'Kenyan English accent. Swahili influence, clear and deliberate pronunciation, rhythmic pacing, soft rolling Rs.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'GA', name: 'Gabon', flag: '🇬🇦', primaryLanguage: 'French', accentDescription: 'Gabonese French accent. Very clear, slightly slower pace, warm Central African intonation, distinct from West Africa.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'BJ', name: 'Bénin', flag: '🇧🇯', primaryLanguage: 'French', accentDescription: 'Beninese French accent. Fon influence, musical and rhythmic, sharp consonants, warm and engaging tone.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'BF', name: 'Burkina Faso', flag: '🇧🇫', primaryLanguage: 'French', accentDescription: 'Burkinabé French accent. Distinct Sahelian rhythm, Mooré influence, grounded and earthy intonation, rolling Rs.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'ML', name: 'Mali', flag: '🇲🇱', primaryLanguage: 'French', accentDescription: 'Malian French accent. Bambara influence, deep and resonant voice, calm and measured Sahelian rhythm.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'TG', name: 'Togo', flag: '🇹🇬', primaryLanguage: 'French', accentDescription: 'Togolese French accent. Ewe and Mina influence, musical, rapid delivery, warm coastal West African vibe.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'TN', name: 'Tunisie', flag: '🇹🇳', primaryLanguage: 'Arabic', accentDescription: 'Tunisian French accent. Soft guttural sounds, rapid rhythmic phrasing, North African Mediterranean melody.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'DZ', name: 'Algérie', flag: '🇩🇿', primaryLanguage: 'Arabic', accentDescription: 'Algerian French accent. Strong consonants, emotional and expressive delivery, distinct Maghrebi intonation.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'EG', name: 'Égypte', flag: '🇪🇬', primaryLanguage: 'Arabic', accentDescription: 'Egyptian English accent. Distinctive Arabic phonetic influence, heavy emphasis on consonants, warm and expressive.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'UG', name: 'Ouganda', flag: '🇺🇬', primaryLanguage: 'English', accentDescription: 'Ugandan English accent. Luganda influence, extremely rhythmic, deliberate pacing, unique East African vowel sounds.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'TZ', name: 'Tanzanie', flag: '🇹🇿', primaryLanguage: 'English', accentDescription: 'Tanzanian English accent. Strong Swahili melodic influence, polite and measured delivery, soft consonants.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'RW', name: 'Rwanda', flag: '🇷🇼', primaryLanguage: 'French', accentDescription: 'Rwandan French accent. Kinyarwanda influence, precise and elegant diction, gentle East African rhythm, soft vowels.', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
];

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Puck', name: 'Puck', gender: 'male' },
  { id: 'Charon', name: 'Charon', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male' },
  { id: 'Aoede', name: 'Aoede', gender: 'female' },
  { id: 'Kore', name: 'Kore', gender: 'female' },
  { id: 'Leda', name: 'Leda', gender: 'female' },
];

export const BG_MUSIC_TRACKS: BackgroundMusic[] = [
  { id: 'afrobeat', name: 'Afrobeat Energy', url: 'https://actions.google.com/animusic/Beat_Plucker.mp3' },
  { id: 'sahel', name: 'Sahel Soul', url: 'https://actions.google.com/animusic/Stellar.mp3' },
  { id: 'lagos', name: 'Lagos Night', url: 'https://actions.google.com/animusic/Sullen_Look.mp3' },
  { id: 'savannah', name: 'Savannah Morning', url: 'https://actions.google.com/animusic/High_Noon.mp3' },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'STARTER',
    price: '1 900 FCFA',
    description: 'Pour démarrer la voix off africaine',
    color: 'stone',
    features: [
      '10 minutes / mois sécurisées',
      '5 pays d’Afrique débloqués',
      '5 voix Naturelles',
      'Qualité audio standard MP3',
      'Utilisation personnelle uniquement',
      '❌ Pas d’Expressions Locales ni d’Humanisation IA',
    ]
  },
  {
    id: 'creator',
    name: 'CREATOR',
    price: '4 900 FCFA',
    description: 'Créateurs de contenu & Réseaux Sociaux',
    color: 'amber',
    isPopular: true,
    features: [
      '30 minutes / mois sécurisées',
      '10 pays & 20 voix débloquées',
      'Voix Naturelles + Dynamiques',
      'Expressions Locales Africaines incluses',
      '✨ Humanisation Phonétique IA incluse',
      'Qualité audio Haute Définition MP3 + WAV',
      'Utilisation commerciale autorisée'
    ]
  },
  {
    id: 'pro',
    name: 'PRO – STUDIO HD',
    price: '8 900 FCFA',
    description: 'Studios, Entreprises & Publicités HD',
    color: 'indigo',
    features: [
      '60 minutes / mois sécurisées',
      '⚡ 20 pays & 60 voix — Bibliothèque complète',
      'Voix Naturelles + Dynamiques + Premium',
      'Qualité Studio HD 24kHz PCM',
      'Expressions locales & Humanisation IA',
      'Support prioritaire par e-mail 24/7'
    ]
  }
];

export const PRICING_PLANS_EN: PricingPlan[] = [
  {
    id: 'free',
    name: 'STARTER',
    price: '1,900 FCFA ($3.00)',
    description: 'To start with African voice-over',
    color: 'stone',
    features: [
      '10 minutes / month secured',
      '5 unlocked African countries',
      '5 Natural voices',
      'Standard MP3 audio quality',
      'Personal use only',
      '❌ No Local Expressions or AI Humanization',
    ]
  },
  {
    id: 'creator',
    name: 'CREATOR',
    price: '4,900 FCFA ($8.00)',
    description: 'Content Creators & Social Media',
    color: 'amber',
    isPopular: true,
    features: [
      '30 minutes / month secured',
      '10 countries & 20 voices unlocked',
      'Natural + Dynamic voices',
      'Local African Expressions included',
      '✨ AI Phonetic Humanization included',
      'High Definition MP3 + WAV exports',
      'Commercial use authorized'
    ]
  },
  {
    id: 'pro',
    name: 'PRO – STUDIO HD',
    price: '8,900 FCFA ($14.50)',
    description: 'Studios, Business & HD Advertisements',
    color: 'indigo',
    features: [
      '60 minutes / month secured',
      '⚡ 20 countries & 60 voices — Full library',
      'Natural + Dynamic + Premium voices',
      'HD Studio Quality 24kHz PCM',
      'Local expressions & AI Humanization',
      'Priority email support 24/7'
    ]
  }
];
