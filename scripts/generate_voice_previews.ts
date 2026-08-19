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
  'NG_BLESSING_01': "Hello, I am Blessing from Nigeria. Welcome to AfriVoice, your complete natural voice solution.",
  'NG_NGOZI_02': "Hey there! I am Ngozi from Lagos! Ready to make your social media content pop and blow up?",
  'NG_EMEKA_03': "Good day. I am Emeka from Abuja. Elevate your brand with authoritative and powerful voiceovers.",

  // Côte d'Ivoire (FR)
  'CI_AMINATA_01': "Bonjour, je suis Aminata d'Abidjan. Bienvenue sur AfriVoice pour des voix naturelles et chaleureuses.",
  'CI_MARIAM_02': "Salut tout le monde ! C'est Mariam ! On va donner une énergie incroyable à vos vidéos !",
  'CI_KOUASSI_03': "Bonjour. Je suis Kouassi. Offrez à vos spots publicitaires et campagnes une prestance exceptionnelle.",

  // Cameroun (FR)
  'CM_CHANTAL_01': "Bonjour, je m'appelle Chantal du Cameroun. Découvrez la douceur et l'authenticité de nos voix.",
  'CM_MARIE_02': "Wouah, salut ! C'est Marie de Yaoundé ! Prête à booster votre communication avec style !",
  'CM_PAUL_03': "Bienvenue. Je suis Paul de Douala. Une voix sobre, crédible et puissante pour vos grands projets.",

  // Sénégal (FR)
  'SN_FATOU_01': "Bonjour, je suis Fatou du Sénégal. Laissez-vous séduire par la chaleur et l'élégance de notre accent.",
  'SN_AWA_02': "Salut les amis ! C'est Awa de Dakar ! Donnons vie à vos idées avec une touche dynamique et moderne !",
  'SN_BABACAR_03': "Salam aleikoum. Je suis Babacar. L'excellence et le professionnalisme au service de vos récits.",

  // Congo (FR)
  'CG_GRACE_01': "Bonjour, ici Grâce du Congo. Une narration fluide et apaisante pour captiver votre audience.",
  'CG_BEATRICE_02': "Salut ! Moi c'est Béatrice de Brazzaville ! On propulse votre contenu au sommet avec enthousiasme !",
  'CG_FISTON_03': "Bonjour. Je suis Fiston. Une voix profonde et assurée pour marquer les esprits avec force.",

  // Ghana (EN)
  'GH_AKUA_01': "Hello, I am Akua from Ghana. Bringing you smooth, natural, and friendly African storytelling.",
  'GH_ABENA_02': "Akwaaba! I am Abena from Accra! Let's create viral videos and engaging promos together!",
  'GH_KWAME_03': "Welcome. I am Kwame. A strong, confident, and professional voice for your corporate media.",

  // Maroc (FR)
  'MA_LEILA_01': "Bonjour, je suis Leïla du Maroc. Un ton doux, chaleureux et raffiné pour sublimer vos messages.",
  'MA_YASMINE_02': "Salam ! C'est Yasmine de Casablanca ! Donnons un coup de peps créatif à vos projets audiovisuels !",
  'MA_YOUSSEF_03': "Bonjour. Je suis Youssef. Une présence vocale distinguée et percutante pour vos publicités.",

  // Afrique du Sud (EN)
  'ZA_NALEDI_01': "Hello, I am Naledi from South Africa. Experience rich, authentic, and engaging vocal identity.",
  'ZA_THANDI_02': "Hi everyone! I am Thandi from Joburg! Ready to bring high energy and excitement to your brand!",
  'ZA_SIPHO_03': "Greetings. I am Sipho from Cape Town. Delivering clear, authoritative impact for your production.",

  // Kenya (EN)
  'KE_WANJIRU_01': "Jambo, I am Wanjiru from Kenya. Warm, clear, and inspiring voiceover for all your projects.",
  'KE_AISHA_02': "Hey! I am Aisha from Nairobi! Let me bring vibrant energy and passion to your campaigns!",
  'KE_KAMAU_03': "Welcome. I am Kamau. A solid, trusted voice built to empower your corporate vision.",

  // Gabon (FR)
  'GA_SYLVIE_01': "Bonjour, je suis Sylvie du Gabon. Une diction claire et naturelle pour accompagner vos productions.",
  'GA_ORNELLA_02': "Coucou ! C'est Ornella de Libreville ! Prête à faire briller vos contenus avec peps et fraîcheur !",
  'GA_HERVE_03': "Bonjour. Je suis Hervé. La garantie d'un timbre sobre, élégant et captivant pour vos spots.",

  // Bénin (FR)
  'BJ_ADJO_01': "Bonjour, je m'appelle Adjo du Bénin. Une voix bienveillante et authentique à votre service.",
  'BJ_FIFAME_02': "Salut ! C'est Fifamè de Cotonou ! Donnons du rythme et de la couleur à tous vos messages !",
  'BJ_KOFFI_03': "Bienvenue. Je suis Koffi. La rigueur et la profondeur vocale pour réussir vos présentations.",

  // Burkina Faso (FR)
  'BF_RASMATA_01': "Bonjour, je suis Rasmata du Burkina Faso. Un accent sincère et chaleureux qui touche le cœur.",
  'BF_MARIAM_02': "Salut ! C'est Mariam de Ouagadougou ! Faisons vibrer vos abonnés avec une énergie communicative !",
  'BF_IBRAHIM_03': "Bonjour. Je suis Ibrahim. Une voix noble, assurée et respectée pour vos grands projets.",

  // Mali (FR)
  'ML_FATOUMATA_01': "Bonjour, je suis Fatoumata du Mali. Laissez-vous porter par la douceur et la sérénité de notre voix.",
  'ML_OUMOU_02': "Salut à tous ! C'est Oumou de Bamako ! Ensemble, donnons du mouvement et du pep's à vos vidéos !",
  'ML_MOUSSA_03': "Salam. Je suis Moussa. Une présence calme, forte et mémorable pour marquer les esprits.",

  // Togo (FR)
  'TG_AMA_01': "Bonjour, je suis Ama du Togo. Une voix harmonieuse et accessible pour vos narrations.",
  'TG_AKOSSIWA_02': "Salut ! C'est Akossiwa de Lomé ! Prête à apporter enthousiasme et spontanéité à vos projets !",
  'TG_KODJO_03': "Bonjour. Je suis Kodjo. La force de l'expérience et l'assurance pour vos communications pro.",

  // Tunisie (FR)
  'TN_AMIRA_01': "Bonjour, je suis Amira de Tunisie. Une voix douce, claire et mélodieuse pour captiver vos auditeurs.",
  'TN_SELMA_02': "Salut ! C'est Selma de Tunis ! Donnons une touche dynamique et captivante à votre marque !",
  'TN_MEHDI_03': "Bonjour. Je suis Mehdi. Une voix chaleureuse et captivante pour un impact garanti.",

  // Algérie (FR)
  'DZ_DJAMILA_01': "Bonjour, je suis Djamila d'Algérie. Une narration expressive et naturelle adaptée à vos attentes.",
  'DZ_NADIA_02': "Salam ! C'est Nadia d'Alger ! Prête à faire décoller votre communication sur le web !",
  'DZ_KARIM_03': "Bonjour. Je suis Karim. L'assurance d'une voix charismatique et convaincante.",

  // Égypte (EN)
  'EG_NOUR_01': "Welcome, I am Nour from Egypt. Smooth, elegant, and timeless vocal delivery for your brand.",
  'EG_YASMIN_02': "Hi there! I am Yasmin from Cairo! Let's make your promotional videos pop with exciting energy!",
  'EG_OMAR_03': "Greetings. I am Omar. Delivering prestige, depth, and strong character to your media.",

  // Ouganda (EN)
  'UG_NAMUKASA_01': "Hello, I am Namukasa from Uganda. Distinctive, melodic, and engaging narration for your audience.",
  'UG_AKELLO_02': "Hey! I am Akello from Kampala! Ready to bring fresh enthusiasm and rhythm to your content!",
  'UG_OKELLO_03': "Welcome. I am Okello. A dependable, rich, and commanding voice for serious storytelling.",

  // Tanzanie (EN)
  'TZ_REHEMA_01': "Jambo, I am Rehema from Tanzania. Gentle, peaceful, and clear vocal presence.",
  'TZ_ZAWADI_02': "Mambo! I am Zawadi from Dar es Salaam! Let's craft fun, energetic, and memorable audio!",
  'TZ_BARAKA_03': "Welcome. I am Baraka. A calm, authoritative, and deeply resonant voice for your project.",

  // Rwanda (FR)
  'RW_UWASE_01': "Bonjour, je suis Uwase du Rwanda. Une diction élégante et mesurée pour illuminer vos messages.",
  'RW_MUTONI_02': "Salut ! C'est Mutoni de Kigali ! Prête à impulser de la modernité et du dynamisme à vos projets !",
  'RW_HABIMANA_03': "Bonjour. Je suis Habimana. Une voix posée, distinguée et rassurante pour vos productions."
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
