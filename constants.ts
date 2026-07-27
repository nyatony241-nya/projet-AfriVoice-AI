
import { Country, VoiceOption, PricingPlan, BackgroundMusic } from './types';

export const COUNTRIES: Country[] = [
  { id: 'NG', name: 'Nigeria', flag: '🇳🇬', primaryLanguage: 'English', accentDescription: 'Naija English accent with energetic rhythm', azureVoiceMale: 'en-NG-AbeoNeural', azureVoiceFemale: 'en-NG-EzinneNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', primaryLanguage: 'French', accentDescription: 'Ivorian French with musicality and specific "Nouchi" influence', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CM', name: 'Cameroun', flag: '🇨🇲', primaryLanguage: 'French', accentDescription: 'Cameroonian accent with distinct stress patterns', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'SN', name: 'Sénégal', flag: '🇸🇳', primaryLanguage: 'French', accentDescription: 'Senegalese French with Wolof influence', azureVoiceMale: 'fr-SN-OumarNeural', azureVoiceFemale: 'fr-SN-MameNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CD', name: 'RD Congo', flag: '🇨🇩', primaryLanguage: 'French', accentDescription: 'Kinshasa-style Lingala-influenced French', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'GH', name: 'Ghana', flag: '🇬🇭', primaryLanguage: 'English', accentDescription: 'Ghanaian English accent, clear and rhythmic', azureVoiceMale: 'en-NG-AbeoNeural', azureVoiceFemale: 'en-NG-EzinneNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'MA', name: 'Maroc', flag: '🇲🇦', primaryLanguage: 'Arabic', accentDescription: 'Moroccan Darija-influenced French', azureVoiceMale: 'fr-MA-JamalNeural', azureVoiceFemale: 'fr-MA-AidaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', primaryLanguage: 'English', accentDescription: 'South African accent with diverse linguistic roots', azureVoiceMale: 'en-ZA-LukeNeural', azureVoiceFemale: 'en-ZA-LeahNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'KE', name: 'Kenya', flag: '🇰🇪', primaryLanguage: 'English', accentDescription: 'Kenyan English with Swahili influence', azureVoiceMale: 'en-KE-ChilembaNeural', azureVoiceFemale: 'en-KE-AsyaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'GA', name: 'Gabon', flag: '🇬🇦', primaryLanguage: 'French', accentDescription: 'Clear Gabonese French', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'BJ', name: 'Bénin', flag: '🇧🇯', primaryLanguage: 'French', accentDescription: 'Beninese French with Fon influence', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'BF', name: 'Burkina Faso', flag: '🇧🇫', primaryLanguage: 'French', accentDescription: 'Burkinabé French', azureVoiceMale: 'fr-SN-OumarNeural', azureVoiceFemale: 'fr-SN-MameNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'ML', name: 'Mali', flag: '🇲🇱', primaryLanguage: 'French', accentDescription: 'Malian French with Bambara influence', azureVoiceMale: 'fr-SN-OumarNeural', azureVoiceFemale: 'fr-SN-MameNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'TG', name: 'Togo', flag: '🇹🇬', primaryLanguage: 'French', accentDescription: 'Togolese French', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'CG', name: 'Congo Brazzaville', flag: '🇨🇬', primaryLanguage: 'French', accentDescription: 'Brazzaville French', azureVoiceMale: 'fr-CI-AboubakarNeural', azureVoiceFemale: 'fr-CI-AissaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'TN', name: 'Tunisie', flag: '🇹🇳', primaryLanguage: 'Arabic', accentDescription: 'Tunisian French', azureVoiceMale: 'fr-TN-HediNeural', azureVoiceFemale: 'fr-TN-ReemNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'DZ', name: 'Algérie', flag: '🇩🇿', primaryLanguage: 'Arabic', accentDescription: 'Algerian French', azureVoiceMale: 'fr-DZ-IsmaelNeural', azureVoiceFemale: 'fr-DZ-AminaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'EG', name: 'Égypte', flag: '🇪🇬', primaryLanguage: 'Arabic', accentDescription: 'Egyptian English/Arabic mix', azureVoiceMale: 'ar-EG-ShakirNeural', azureVoiceFemale: 'ar-EG-SalmaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'UG', name: 'Ouganda', flag: '🇺🇬', primaryLanguage: 'English', accentDescription: 'Ugandan English', azureVoiceMale: 'en-KE-ChilembaNeural', azureVoiceFemale: 'en-KE-AsyaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
  { id: 'TZ', name: 'Tanzanie', flag: '🇹🇿', primaryLanguage: 'English', accentDescription: 'Tanzanian English with Swahili rhythm', azureVoiceMale: 'en-TZ-DaudiNeural', azureVoiceFemale: 'en-TZ-RehemaNeural', geminiVoiceMale: 'Puck', geminiVoiceFemale: 'Aoede' },
];

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Puck', name: 'Puck', gender: 'male' },
  { id: 'Charon', name: 'Charon', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male' },
  { id: 'Aoede', name: 'Aoede', gender: 'female' },
  { id: 'Kore', name: 'Kore', gender: 'female' },
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

