
import { Country, VoiceOption, PricingPlan, BackgroundMusic } from './types';

export const COUNTRIES: Country[] = [
  { id: 'NG', name: 'Nigeria', flag: '🇳🇬', primaryLanguage: 'English', accentDescription: 'Naija English accent with energetic rhythm' },
  { id: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', primaryLanguage: 'French', accentDescription: 'Ivorian French with musicality and specific "Nouchi" influence' },
  { id: 'CM', name: 'Cameroun', flag: '🇨🇲', primaryLanguage: 'French', accentDescription: 'Cameroonian accent with distinct stress patterns' },
  { id: 'SN', name: 'Sénégal', flag: '🇸🇳', primaryLanguage: 'French', accentDescription: 'Senegalese French with Wolof influence' },
  { id: 'CD', name: 'RD Congo', flag: '🇨🇩', primaryLanguage: 'French', accentDescription: 'Kinshasa-style Lingala-influenced French' },
  { id: 'GH', name: 'Ghana', flag: '🇬🇭', primaryLanguage: 'English', accentDescription: 'Ghanaian English accent, clear and rhythmic' },
  { id: 'MA', name: 'Maroc', flag: '🇲🇦', primaryLanguage: 'Arabic', accentDescription: 'Moroccan Darija-influenced French' },
  { id: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', primaryLanguage: 'English', accentDescription: 'South African accent with diverse linguistic roots' },
  { id: 'KE', name: 'Kenya', flag: '🇰🇪', primaryLanguage: 'English', accentDescription: 'Kenyan English with Swahili influence' },
  { id: 'GA', name: 'Gabon', flag: '🇬🇦', primaryLanguage: 'French', accentDescription: 'Clear Gabonese French' },
  { id: 'BJ', name: 'Bénin', flag: '🇧🇯', primaryLanguage: 'French', accentDescription: 'Beninese French with Fon influence' },
  { id: 'BF', name: 'Burkina Faso', flag: '🇧🇫', primaryLanguage: 'French', accentDescription: 'Burkinabé French' },
  { id: 'ML', name: 'Mali', flag: '🇲🇱', primaryLanguage: 'French', accentDescription: 'Malian French with Bambara influence' },
  { id: 'TG', name: 'Togo', flag: '🇹🇬', primaryLanguage: 'French', accentDescription: 'Togolese French' },
  { id: 'CG', name: 'Congo Brazzaville', flag: '🇨🇬', primaryLanguage: 'French', accentDescription: 'Brazzaville French' },
  { id: 'TN', name: 'Tunisie', flag: '🇹🇳', primaryLanguage: 'Arabic', accentDescription: 'Tunisian French' },
  { id: 'DZ', name: 'Algérie', flag: '🇩🇿', primaryLanguage: 'Arabic', accentDescription: 'Algerian French' },
  { id: 'EG', name: 'Égypte', flag: '🇪🇬', primaryLanguage: 'Arabic', accentDescription: 'Egyptian English/Arabic mix' },
  { id: 'UG', name: 'Ouganda', flag: '🇺🇬', primaryLanguage: 'English', accentDescription: 'Ugandan English' },
  { id: 'TZ', name: 'Tanzanie', flag: '🇹🇿', primaryLanguage: 'English', accentDescription: 'Tanzanian English with Swahili rhythm' },
];

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', gender: 'male' },
  { id: 'Puck', name: 'Puck', gender: 'male' },
  { id: 'Charon', name: 'Charon', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female' },
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
    name: 'FREE – Découverte',
    price: '0 FCFA',
    description: 'Pour tester la voix de l’Afrique',
    color: 'stone',
    features: [
      '3 générations / jour',
      '30 secondes max / audio',
      '5 pays débloqués',
      'Accent léger standard',
      'MP3 standard',
      'Filigrane audio non commercial'
    ]
  },
  {
    id: 'creator',
    name: 'CREATOR',
    price: '3 500 FCFA',
    description: 'Créateurs TikTok & YouTube',
    color: 'amber',
    isPopular: true,
    features: [
      '60 minutes / mois sécurisées',
      '20 pays & tous les accents',
      'Expressions Locales & Accent Typique',
      'Sans filigrane • Export MP3 + WAV',
      'Utilisation commerciale monétisée',
      'Mastering audio de base'
    ]
  },
  {
    id: 'pro',
    name: 'PRO – Business HD',
    price: '9 900 FCFA',
    description: 'Studios, Médias & Podcasts',
    color: 'indigo',
    features: [
      '160 minutes / mois sécurisées',
      '🧬 Clonage Vocal Instantané (1 Voix)',
      'Qualité Studio HD 24kHz PCM',
      'Expressions & Émotions radio',
      'Console de Mastering HD + Afrobeat',
      'Support prioritaire par e-mail'
    ]
  }
];

export const PRICING_PLANS_EN: PricingPlan[] = [
  {
    id: 'free',
    name: 'FREE – Discovery',
    price: '0 FCFA ($0)',
    description: 'To test the voice of Africa',
    color: 'stone',
    features: [
      '3 generations / day',
      '30 seconds max / audio',
      '5 countries unlocked',
      'Standard light accent',
      'Standard MP3 quality',
      'Non-commercial audio watermark'
    ]
  },
  {
    id: 'creator',
    name: 'CREATOR',
    price: '3,500 FCFA ($6)',
    description: 'TikTok & YouTube Creators',
    color: 'amber',
    isPopular: true,
    features: [
      '60 minutes / month secured',
      '20 countries & all accents',
      'Local Expressions & Authentic Accent',
      'No watermark • MP3 + WAV export',
      'Monetized commercial use',
      'Basic audio mastering'
    ]
  },
  {
    id: 'pro',
    name: 'PRO – Business HD',
    price: '9,900 FCFA ($16.50)',
    description: 'Studios, Media & Podcasts',
    color: 'indigo',
    features: [
      '160 minutes / month secured',
      '🧬 Instant Voice Cloning (1 Voice)',
      'HD Studio Quality 24kHz PCM',
      'Radio expressions & emotions',
      'HD Mastering Console + Afrobeat',
      'Priority email support'
    ]
  }
];

