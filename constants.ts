import { Country, VoiceSettings, VoiceOption, PricingPlan } from './types';

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
  { id: 'Puck', name: 'Puck', gender: 'male' },
  { id: 'Charon', name: 'Charon', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male' },
  { id: 'Aoede', name: 'Aoede', gender: 'female' },
  { id: 'Kore', name: 'Kore', gender: 'female' },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'FREE – Découverte',
    price: '0 FCFA/mois',
    description: 'Pour tester la voix de l’Afrique',
    color: 'stone',
    features: [
      'Limité à 90 secondes au total',
      '5 pays débloqués',
      'Accent léger standard',
      'Qualité Standard'
    ]
  },
  {
    id: 'creator',
    name: 'CREATOR',
    price: '3 500 FCFA/mois',
    description: 'Créateurs TikTok & YouTube',
    color: 'amber',
    isPopular: true,
    features: [
      '60 minutes / mois',
      '20 pays & tous les accents',
      'Sans limite par génération',
      'Utilisation commerciale'
    ]
  },
  {
    id: 'pro',
    name: 'PRO – Business HD',
    price: '9 900 FCFA/mois',
    description: 'Studios, Médias & Podcasts',
    color: 'indigo',
    features: [
      '160 minutes / mois',
      'Priorité de génération',
      'Support prioritaire',
      'Qualité HD'
    ]
  }
];

