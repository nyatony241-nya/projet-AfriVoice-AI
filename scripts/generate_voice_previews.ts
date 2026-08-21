import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { VOICE_REGISTRY } from '../services/voiceRegistry';
import { buildDirectorPrompt } from '../services/promptBuilder.js';
import type { VoiceIdentity } from '../types';

// Load environment variables
dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'ta_cle_gemini_ici') {
  console.error('❌ GEMINI_API_KEY is missing in environment variables (.env.local)');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const SAMPLES_DIR = path.resolve(process.cwd(), 'public/voice-samples');
const isForceMode = process.argv.includes('--force');

// Helper to pause execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Convert PCM L16 base64 (24kHz 16-bit Mono) to RIFF WAV Buffer
function pcmToWavBuffer(base64Pcm: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const pcmBuffer = Buffer.from(base64Pcm, 'base64');
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Tailored natural preview phrases per country and persona
const PREVIEW_SCRIPTS: Record<string, string> = {
  // Nigeria (EN)
  'NG_EMEKA_03': "How far, my people! I am Emeka, your voice from the heart of Nigeria. Ehen! Whether it's for your business, your podcast, or your brand, I bring you that authentic and warm Naija presence.",
  'NG_NGOZI_02': "Heey! Na Ngozi be this o! If you wan blow on social media, I go give your content that Lagos energy wey nobody fit ignore. Let's go!",
  'NG_BLESSING_01': "Greetings. I am Blessing. When your brand needs that top-tier, authoritative voice that commands respect across Africa and beyond, you can count on my world-class Nigerian delivery.",

  // Côte d'Ivoire (FR)
  'CI_AMINATA_01': "Akwaba ! Je suis Aminata de la belle Côte d'Ivoire. Que ce soit pour raconter une histoire ou présenter votre entreprise, ma voix vous apporte cette chaleur typiquement ivoirienne. On est ensemble !",
  'CI_KOUASSI_03': "Eh Allah ! C'est Kouassi d'Abidjan ! Si tu veux que ta vidéo fasse le buzz et capte tout le monde sur internet, donne-moi le micro ! On va tout casser, c'est gâté !",
  'CI_MARIAM_02': "Bonjour, je suis Mariam. Pour vos documentaires, vos publicités de prestige ou vos communications institutionnelles, ma voix vous offre une élégance et une prestance incomparables, directement depuis Babi.",

  // Cameroun (FR)
  'CM_PAUL_03': "Bonjour à tous, c'est Paul du Cameroun. Eh oui, la vraie voix du terroir ! Je vous accompagne avec calme et assurance pour donner vie à vos projets les plus chers. On est ensemble !",
  'CM_CHANTAL_01': "Mouf ! C'est Chantal de Douala ! Tu cherches l'énergie qui va faire sauter ton audience au plafond ? Laisse-moi enflammer ton contenu avec la vraie vibe camerounaise. On y va !",
  'CM_MARIE_02': "Mesdames et messieurs, je suis Marie. L'excellence n'a pas de prix. Pour vos campagnes publicitaires de haut niveau et vos présentations officielles, ma voix incarne la force et la fierté du continent.",

  // Sénégal (FR)
  'SN_FATOU_01': "Salamaleikoum, je suis Fatou du Sénégal. Ma voix porte la teranga — cette chaleur sénégalaise qui touche directement le cœur de vos auditeurs. Dieuredieuf de m'écouter et à très vite.",
  'SN_BABACAR_03': "Waw waw ! C'est Babacar de Dakar ! Prêt à dynamiser vos vidéos et faire bouger la toile ? Avec mon énergie, votre message ne passera jamais inaperçu. Nio far, on est ensemble !",
  'SN_AWA_02': "Bonjour, je suis Awa. Quand l'élégance rencontre l'autorité, votre marque prend une toute autre dimension. Offrez à vos auditeurs une expérience vocale sénégalaise d'une qualité studio irréprochable.",

  // Congo (FR)
  'CG_FISTON_03': "Mbote na bino ! Je suis Fiston du Congo. Je prête ma voix chaleureuse et posée à vos histoires pour créer une connexion vraie et profonde avec votre public.",
  'CG_GRACE_01': "Éh la famille ! C'est Grâce ! Si tu veux de l'ambiance, du peps et une voix qui réveille tout le monde sur les réseaux, c'est moi qu'il te faut ! Tokooos !",
  'CG_BEATRICE_02': "Bonjour, je suis Béatrice. Le prestige exige une narration parfaite. Pour vos vidéos corporatives et vos documentaires haut de gamme, ma voix congolaise vous assure un impact magistral.",

  // Ghana (EN)
  'GH_AKUA_01': "Akwaaba! I am Akua from Ghana. Just like our famous jollof, my voice brings that comforting, warm, and rich flavor to your everyday storytelling. Medaase for choosing me.",
  'GH_KWAME_03': "Chale, what's up! Kwame here! You want your content to go viral and grab attention immediately? I've got that pure Accra street energy to make your audience stop and listen!",
  'GH_ABENA_02': "Greetings. I am Abena. For brands that demand absolute excellence, my commanding and sophisticated voice delivers the ultimate premium experience for your global campaigns.",

  // Maroc (FR)
  'MA_YOUSSEF_03': "Salam ! Je suis Youssef du Maroc. Avec douceur et sincérité, je vous aide à tisser un lien de confiance avec vos clients. Marhaba, bienvenue dans mon univers vocal.",
  'MA_LEILA_01': "Yallah ! C'est Leïla de Casablanca ! Vous voulez du rythme, de la fraîcheur et une voix qui accroche dès la première seconde ? Suivez-moi, on va faire sensation !",
  'MA_YASMINE_02': "Bonjour, je suis Yasmine. Pour représenter votre marque avec majesté et raffinement, ma voix de velours offre une signature marocaine d'un prestige absolu.",

  // Afrique du Sud (EN)
  'ZA_NALEDI_01': "Sawubona! I am Naledi from South Africa. I'm here to share your stories with that warm, authentic Mzansi spirit that makes everyone feel right at home. Sho sho!",
  'ZA_SIPHO_03': "Heita hola! It's Sipho from Jozi! If you need high energy, massive vibes, and a voice that keeps the timeline buzzing, you have found your guy! Let's do this!",
  'ZA_THANDI_02': "Good day. I am Thandi. When authority and elegance are non-negotiable, my voice provides the polished, world-class South African standard your corporate projects deserve.",

  // Kenya (EN)
  'KE_KAMAU_03': "Jambo! I am Kamau from beautiful Kenya. I bring a steady, comforting, and deeply natural tone to ensure your message is heard, understood, and trusted. Karibu sana.",
  'KE_WANJIRU_01': "Sasa! Wanjiru here from Nairobi! Ready to hype up your brand and bring that unstoppable East African energy to your videos? Let's make some noise!",
  'KE_AISHA_02': "Greetings, I am Aisha. For documentaries, luxury brands, and executive presentations, my voice delivers the commanding presence and unmatched quality you expect.",

  // Gabon (FR)
  'GA_SYLVIE_01': "Mbolo ! Je suis Sylvie du Gabon. Ma voix douce et rassurante est là pour accompagner vos auditeurs comme un ami fidèle. Confiez-moi vos plus beaux textes.",
  'GA_HERVE_03': "Eh ah ! C'est Hervé de Libreville ! Tu cherches une voix qui claque pour tes pubs et tes réseaux sociaux ? Avec moi, l'ambiance est garantie, on va tout casser !",
  'GA_ORNELLA_02': "Bonjour, ici Ornella. L'excellence de la voix off gabonaise à votre service. Une diction parfaite et une assurance hors pair pour vos campagnes institutionnelles et documentaires.",

  // Bénin (FR)
  'BJ_KOFFI_03': "Kouabo ! Je suis Koffi du Bénin. Je donne vie à vos projets avec ce ton naturel et apaisant qui instaure directement la confiance. Merci de m'écouter.",
  'BJ_ADJO_01': "Coucou tout le monde ! C'est Adjo de Cotonou ! Besoin d'une énergie folle pour booster vos ventes et animer vos vidéos ? Je suis là, allons-y !",
  'BJ_FIFAME_02': "Bonjour, je suis Fifamè. Incarnez le succès et la fiabilité avec une voix béninoise premium, taillée sur mesure pour les marques exigeantes et les communications de haut vol.",

  // Burkina Faso (FR)
  'BF_RASMATA_01': "Ne y wogo ! Je suis Rasmata du pays des Hommes intègres. Avec ma voix sincère et chaleureuse, je raconte vos histoires avec toute l'authenticité du Burkina Faso.",
  'BF_IBRAHIM_03': "Eh bien ! C'est Ibrahim de Ouaga ! Vous voulez réveiller votre public et capter l'attention en un clin d'œil ? Confiez-moi vos textes, l'impact est assuré !",
  'BF_MARIAM_02': "Bonjour, c'est Mariam. Pour vos productions de classe internationale, je vous apporte une narration puissante, solennelle et majestueuse. La qualité studio par excellence.",

  // Mali (FR)
  'ML_MOUSSA_03': "Aw ni tié ! Je suis Moussa du Mali. Une voix posée, authentique et rassurante, parfaite pour guider vos auditeurs et transmettre vos valeurs avec sagesse.",
  'ML_FATOUMATA_01': "Hé les amis ! C'est Fatoumata de Bamako ! Prête à mettre le feu à vos contenus digitaux ! Si vous cherchez du dynamisme et de la joie, c'est parti !",
  'ML_OUMOU_02': "Bonjour, je suis Oumou. Le prestige malien dans toute sa splendeur. Ma voix offre une prestance et une autorité naturelles pour vos documentaires et projets corporate.",

  // Togo (FR)
  'TG_AMA_01': "Miawezon ! Je suis Ama du Togo. Pour vos podcasts ou vos vidéos explicatives, je vous propose une voix douce, claire et toujours souriante. À très bientôt.",
  'TG_KODJO_03': "Eh oui ! C'est Kodjo de Lomé ! Vous cherchez une voix percutante qui va faire défiler les vues et les partages ? Ne cherchez plus, je suis votre homme !",
  'TG_AKOSSIWA_02': "Bonjour, je suis Akossiwa. L'élégance et la clarté d'une voix professionnelle togolaise. Idéale pour vos messages institutionnels nécessitant une confiance et une crédibilité absolues.",

  // Tunisie (FR)
  'TN_MEHDI_03': "Aslema ! Je suis Mehdi de Tunisie. Une voix familière et chaleureuse pour accompagner votre public au quotidien. Avec moi, votre message passe en toute simplicité.",
  'TN_AMIRA_01': "Aychek ! C'est Amira de Tunis ! On met le turbo ? Si vous voulez une communication vibrante et moderne qui accroche les jeunes, c'est avec moi que ça se passe !",
  'TN_SELMA_02': "Bonjour, je suis Selma. Une voix distinguée, profonde et parfaitement maîtrisée. L'atout majeur pour vos campagnes de luxe et vos présentations officielles.",

  // Algérie (FR)
  'DZ_DJAMILA_01': "Saha ! Je suis Djamila d'Algérie. La sincérité avant tout. Je donne à vos textes une couleur locale, humaine et attachante pour toucher le cœur de votre cible.",
  'DZ_KARIM_03': "Wesh la famille ! C'est Karim d'Alger ! Vous voulez du rythme, de la puissance et une énergie débordante pour vos vidéos ? Allez, on y va à fond !",
  'DZ_NADIA_02': "Bonjour, je suis Nadia. L'assurance d'une grande voix algérienne. Une narration impeccable, sérieuse et charismatique, spécialement conçue pour vos productions haut de gamme.",

  // Égypte (EN)
  'EG_OMAR_03': "Ahlan wa sahlan! I am Omar from Egypt. I offer a calm, warm, and natural storytelling voice that builds an instant bond of trust with your audience. Shukran.",
  'EG_NOUR_01': "Yalla bina! Nour here from Cairo! Need that upbeat, trendy energy to make your next viral video shine? I'll give your brand the massive boost it deserves!",
  'EG_YASMIN_02': "Greetings. I am Yasmin. When you require a sophisticated and majestic voice for your international corporate brand, I deliver unmatched Egyptian elegance and authority.",

  // Ouganda (EN)
  'UG_NAMUKASA_01': "Oli otya! I am Namukasa from Uganda. Experience the true warmth of the Pearl of Africa in every word I speak. Let's tell your story naturally and beautifully.",
  'UG_OKELLO_03': "Hey, hey! It's Okello from Kampala! Looking to grab attention and keep your audience fully engaged? My vibrant energy will bring your scripts to life right now!",
  'UG_AKELLO_02': "Good day, I am Akello. A commanding, clear, and perfectly paced voice. I provide the ultimate professional polish for your most important business and documentary projects.",

  // Tanzanie (EN)
  'TZ_BARAKA_03': "Mambo vipi! I am Baraka from Tanzania. My voice brings you the peace and natural beauty of our land. Perfect for narration that needs to be deeply felt. Karibu.",
  'TZ_REHEMA_01': "Habari! Rehema here from Dar es Salaam! Want to make your brand impossible to ignore? Let me inject fun, hype, and pure excitement into your next campaign!",
  'TZ_ZAWADI_02': "Greetings. I am Zawadi. The standard of excellence. For premium advertising and corporate communications, my voice offers a distinguished and authoritative Swahili-English presence.",

  // Rwanda (FR)
  'RW_UWASE_01': "Muraho ! Je suis Uwase du Rwanda. Laissez ma voix douce et apaisante du pays des mille collines porter vos mots avec grâce et authenticité. Merci.",
  'RW_HABIMANA_03': "Eh bien salut ! C'est Habimana de Kigali ! Besoin d'une énergie communicative pour vos réseaux sociaux et vos lancements de produits ? Avec moi, on passe à la vitesse supérieure !",
  'RW_MUTONI_02': "Bonjour, je suis Mutoni. Le raffinement et la perfection vocale. Pour vos projets de grande envergure, je vous garantis une présence majestueuse et une diction irréprochable."
};

interface ExecutionReport {
  totalProfiles: number;
  generated: number;
  skipped: number;
  errors: number;
  details: Array<{
    voiceId: string;
    persona: string;
    country: string;
    tier: string;
    providerVoiceId: string;
    status: 'GENERATED' | 'SKIPPED' | 'ERROR';
    error?: string;
  }>;
}

async function main() {
  console.log('\n======================================================');
  console.log('🎙️ [AfriVoice AI] VOICE PREVIEW GENERATION SYSTEM');
  console.log('======================================================');
  console.log(`- Target directory: ${SAMPLES_DIR}`);
  console.log(`- Mode: ${isForceMode ? 'FORCE REGENERATION (--force)' : 'PROTECTED (skip existing)'}`);

  // Ensure output directory exists
  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  }

  const voiceEntries = Object.entries(VOICE_REGISTRY);
  console.log(`- Voice Profiles found in registry: ${voiceEntries.length}`);

  const report: ExecutionReport = {
    totalProfiles: voiceEntries.length,
    generated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (let i = 0; i < voiceEntries.length; i++) {
    const [voiceId, voice] = voiceEntries[i];
    const indexStr = `[${i + 1}/${voiceEntries.length}]`;
    const targetFilePath = path.join(SAMPLES_DIR, `${voiceId}.mp3`);

    console.log(`\n${indexStr} Processing ${voiceId} (${voice.persona} — ${voice.countryName} ${voice.flag})`);
    console.log(`   Provider Voice ID: ${voice.providerVoiceId} | Tier: ${voice.tier}`);

    // Protection check
    if (fs.existsSync(targetFilePath) && !isForceMode) {
      console.log(`   ⏩ SKIP — ${voiceId}.mp3 already exists`);
      report.skipped++;
      report.details.push({
        voiceId,
        persona: voice.persona,
        country: voice.countryName,
        tier: voice.tier,
        providerVoiceId: voice.providerVoiceId,
        status: 'SKIPPED',
      });
      continue;
    }

    // Determine script to use
    const script = PREVIEW_SCRIPTS[voiceId] || `Bonjour, je suis ${voice.persona} de ${voice.countryName}. Bienvenue sur AfriVoice.`;

    // Build prompt and verify providerVoiceId alignment
    const { directorBrief, actualVoiceId } = buildDirectorPrompt({
      script,
      voiceId,
      voiceIdentity: voice,
      countryId: voice.countryId,
      countryName: voice.countryName,
      gender: voice.gender,
      voiceVariant: voice.voiceVariant,
      emotion: voice.defaultEmotion,
      contentStyle: voice.defaultContentStyle,
      personality: voice.defaultPersonality,
    });

    // STRICT SAFETY CHECK: preview.providerVoiceId === production.providerVoiceId
    if (actualVoiceId !== voice.providerVoiceId) {
      const errMsg = `CRITICAL MISMATCH! Resolved voice "${actualVoiceId}" does NOT match expected "${voice.providerVoiceId}" for ${voiceId}`;
      console.error(`   ❌ ERROR: ${errMsg}`);
      report.errors++;
      report.details.push({
        voiceId,
        persona: voice.persona,
        country: voice.countryName,
        tier: voice.tier,
        providerVoiceId: voice.providerVoiceId,
        status: 'ERROR',
        error: errMsg,
      });
      continue;
    }

    // Call Gemini API with Retry logic (3 retries max)
    let attempts = 0;
    let success = false;
    let base64Audio: string | undefined;
    let lastError: string | undefined;

    while (attempts < 3 && !success) {
      attempts++;
      try {
        if (attempts > 1) {
          const delay = attempts * 2000;
          console.log(`   ⏳ Retry attempt ${attempts}/3 after ${delay}ms...`);
          await sleep(delay);
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: directorBrief }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice.providerVoiceId,
                },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        base64Audio = part?.inlineData?.data;

        if (!base64Audio) {
          throw new Error('Empty inlineData audio response from Gemini API');
        }

        success = true;
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`   ⚠️ Attempt ${attempts} failed: ${lastError}`);
      }
    }

    if (success && base64Audio) {
      const wavBuffer = pcmToWavBuffer(base64Audio, 24000, 1, 16);
      fs.writeFileSync(targetFilePath, wavBuffer);
      console.log(`   ✅ GENERATED — ${voiceId}.mp3 (${wavBuffer.length} bytes, provider: ${voice.providerVoiceId})`);
      report.generated++;
      report.details.push({
        voiceId,
        persona: voice.persona,
        country: voice.countryName,
        tier: voice.tier,
        providerVoiceId: voice.providerVoiceId,
        status: 'GENERATED',
      });
    } else {
      console.error(`   ❌ FAILED to generate ${voiceId}.mp3 after 3 attempts: ${lastError}`);
      report.errors++;
      report.details.push({
        voiceId,
        persona: voice.persona,
        country: voice.countryName,
        tier: voice.tier,
        providerVoiceId: voice.providerVoiceId,
        status: 'ERROR',
        error: lastError,
      });
    }

    // Pause between requests to respect rate limit (3000ms)
    await sleep(3000);
  }

  // Print Final Report
  console.log('\n======================================================');
  console.log('📊 FINAL EXECUTION REPORT — VOICE PREVIEW GENERATION');
  console.log('======================================================');
  console.log(`- Voice Profiles Total: ${report.totalProfiles}`);
  console.log(`- Previews Generated:  ${report.generated}`);
  console.log(`- Previews Skipped:    ${report.skipped}`);
  console.log(`- Errors Encountered:  ${report.errors}`);
  console.log('------------------------------------------------------');
  console.log('DETAILS BY VOICE IDENTITY:');
  console.table(
    report.details.map((d) => ({
      'Voice ID': d.voiceId,
      Persona: d.persona,
      Country: d.country,
      Tier: d.tier,
      ProviderVoice: d.providerVoiceId,
      Status: d.status,
      Error: d.error || 'None',
    }))
  );
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
