import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { humanizeScript } from "../services/phonetic-humanizer/index.js";
// @ts-ignore
import { buildDirectorPrompt } from "../services/promptBuilder.js";
// @ts-ignore
import { VOICE_PROFILES } from "../services/voiceProfiles.js";
// @ts-ignore
import { synthesizeWithGoogleVoiceClone } from "../services/googleTtsService.js";

const aiClientCache = new Map<string, GoogleGenAI>();

function getAiClient(apiKey: string): GoogleGenAI {
  if (!aiClientCache.has(apiKey)) {
    aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
  }
  return aiClientCache.get(apiKey)!;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const body = req.body || {};
    const { script, voiceId, customApiKey, options, voiceProfileId } = body;

    if (!script || typeof script !== 'string' || !script.trim()) {
      return res.status(400).json({ error: "Le paramètre 'script' est requis et ne peut pas être vide." });
    }

    const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY')
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'ta_cle_gemini_ici') {
      return res.status(401).json({
        error: 'Clé API Gemini manquante. Veuillez configurer la variable GEMINI_API_KEY dans vos paramètres Vercel ou la renseigner localement.',
        diagnostic: {
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'present' : 'MISSING',
        }
      });
    }

    // Validation Supabase optionnelle
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data.user) {
            console.warn('[AfriVoice] Auth token invalid/expired — continuing:', error?.message);
          } else {
            console.log('[AfriVoice] Auth OK — user:', data.user.email);
          }
        }
      } catch (authError: any) {
        console.warn('[AfriVoice] Supabase auth check failed (non-blocking):', authError?.message);
      }
    }

    // 1. Humanisation Phonétique du script si demandée
    const finalScript = options?.phoneticHumanizer
      ? humanizeScript(script, options.countryId, { contentStyle: options.contentStyle, emotion: options.emotion })
      : script;

    // 2. Vérification des profils vocaux persistants
    const targetProfileId = voiceProfileId || options?.voiceProfileId;
    let voiceCloningKey = '';
    let isReplicationAttempted = false;
    let replicationStatus: 'VOICE_REPLICATION_SUCCESS' | 'VOICE_REPLICATION_UNAVAILABLE' | 'VOICE_REPLICATION_ERROR' | 'VOICE_FALLBACK_USED' = 'VOICE_REPLICATION_UNAVAILABLE';
    let profileData: any = null;

    if (targetProfileId && VOICE_PROFILES[targetProfileId]) {
      profileData = VOICE_PROFILES[targetProfileId];
      if (process.env.ENABLE_VOICE_REPLICATION === 'true' && profileData.provider === 'google' && profileData.voiceCloningKey) {
        voiceCloningKey = profileData.voiceCloningKey;
        isReplicationAttempted = true;
      }
    }

    let audioData: string | undefined;
    let mimeType = 'audio/L16;rate=24000';

    if (isReplicationAttempted && voiceCloningKey) {
      try {
        console.log(`🎙️ [AfriVoice] Tentative de réplication vocale Google Cloud TTS pour le profil : ${targetProfileId}`);
        const base64Wav = await synthesizeWithGoogleVoiceClone({
          text: script,
          voiceCloningKey,
          languageCode: 'fr-FR',
          speakingRate: profileData.basePace || 1.0
        });
        audioData = base64Wav;
        mimeType = 'audio/wav';
        replicationStatus = 'VOICE_REPLICATION_SUCCESS';
      } catch (replicationError: any) {
        console.error(`❌ [AfriVoice] Erreur de réplication vocale Google Cloud TTS :`, replicationError?.message || replicationError);
        replicationStatus = 'VOICE_REPLICATION_ERROR';
      }
    }

    // Fallback vers le moteur Gemini classique si aucun audio n'a été produit par la réplication
    if (!audioData) {
      if (isReplicationAttempted) {
        replicationStatus = 'VOICE_FALLBACK_USED';
      }

      // 3. Construction chirurgicale du prompt à partir de la source de vérité partagée
      const { directorBrief: fullPrompt, actualVoiceId } = buildDirectorPrompt({
        script,
        countryId: options?.countryId || (profileData ? 'SN' : undefined),
        countryName: options?.countryName || (profileData ? 'Senegal' : "Côte d'Ivoire"),
        gender: options?.gender || profileData?.gender || 'female',
        age: options?.age || 30,
        voiceVariant: options?.voiceVariant || voiceId || profileData?.voiceVariant || 'voice1',
        accentLevel: options?.accentLevel || 'strong',
        useLocalExpressions: options?.useLocalExpressions,
        emotion: options?.emotion,
        contentStyle: options?.contentStyle || profileData?.persona?.toLowerCase(),
        personality: options?.personality,
        vocalObjective: options?.vocalObjective,
        speed: options?.speed || profileData?.basePace,
        pitch: options?.pitch,
        phoneticScript: finalScript,
      });

      const ai = getAiClient(apiKey);

      // 4. Appel de l'API Gemini TTS
      let geminiResponse;
      try {
        geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: actualVoiceId },
              },
            },
          },
        });
      } catch (apiError: any) {
        console.error('[AfriVoice] Gemini API call failed:', apiError);
        
        const errMessage = apiError?.message || '';
        const isAuthError = 
          apiError?.status === 401 || 
          errMessage.includes('API_KEY_INVALID') || 
          errMessage.includes('key not valid') ||
          errMessage.includes('UNAUTHENTICATED') ||
          errMessage.includes('invalid credentials');

        if (isAuthError) {
          return res.status(401).json({
            error: 'Clé API Gemini invalide ou expirée. Veuillez vérifier votre clé API (GEMINI_API_KEY) dans les variables d\'environnement Vercel ou dans les paramètres du Studio.',
            errorType: 'API_KEY_INVALID'
          });
        }
        throw apiError;
      }

      const part = geminiResponse.candidates?.[0]?.content?.parts?.[0];
      audioData = (part as any)?.inlineData?.data;
      mimeType = (part as any)?.inlineData?.mimeType || 'audio/L16;rate=24000';
    }

    if (!audioData) {
      return res.status(500).json({
        error: 'Aucune donnée audio reçue de la synthèse.',
      });
    }

    const generationId = 'gen_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const metadata = profileData ? {
      generationId,
      voiceProfileId: profileData.voiceProfileId,
      voiceProfileVersion: profileData.version,
      provider: replicationStatus === 'VOICE_REPLICATION_SUCCESS' ? 'google_replication' : 'gemini_legacy',
      model: replicationStatus === 'VOICE_REPLICATION_SUCCESS' ? 'chirp-3' : 'gemini-2.5-flash',
      language: profileData.language,
      country: profileData.country,
      pace: profileData.basePace,
      createdAt: new Date().toISOString(),
      status: replicationStatus
    } : undefined;

    return res.status(200).json({ base64Audio: audioData, mimeType, metadata });

  } catch (error: any) {
    console.error('[AfriVoice] Error:', error?.message || error);
    const statusCode = typeof error?.status === 'number' ? Math.min(error.status, 599) : 500;
    return res.status(statusCode).json({
      error: error?.message || 'Erreur inconnue lors de la génération audio.',
      errorType: error?.constructor?.name || 'UnknownError',
    });
  }
}
