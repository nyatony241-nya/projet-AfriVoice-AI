import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { humanizeScript } from "../services/phonetic-humanizer/index.js";
// @ts-ignore
import { buildDirectorPrompt } from "../services/promptBuilder.js";
// @ts-ignore
import { VOICE_PROFILES, getVoiceProfileByCountryAndGender } from "../services/voiceProfiles.js";
// Google TTS Voice Cloning service - désactivé (fichier supprimé)
const synthesizeWithGoogleVoiceClone: any = null;

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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { script, voiceId, customApiKey, options, voiceProfileId } = req.body;

  if (!script) {
    return res.status(400).json({ error: "Le paramètre 'script' est requis." });
  }

  const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
    ? customApiKey.trim() 
    : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'ta_cle_gemini_ici') {
    return res.status(401).json({ error: "Aucune clé API Gemini configurée." });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Token d'authentification manquant." });
      }
      const token = authHeader.split(' ')[1];
      const { error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        console.warn('[AfriVoice] Supabase auth check failed (non-blocking):', authError?.message);
      }
    }

    // 1. Humanisation Phonétique du script si demandée
    const finalScript = options?.phoneticHumanizer
      ? humanizeScript(script, options.countryId, { contentStyle: options.contentStyle, emotion: options.emotion })
      : script;

    // 2. Vérification et résolution dynamique des profils vocaux pour les 19 pays
    const targetProfileId = voiceProfileId || options?.voiceProfileId;
    let voiceCloningKey = '';
    let isReplicationAttempted = false;
    let replicationStatus: 'VOICE_REPLICATION_SUCCESS' | 'VOICE_REPLICATION_UNAVAILABLE' | 'VOICE_REPLICATION_ERROR' | 'VOICE_FALLBACK_USED' = 'VOICE_REPLICATION_UNAVAILABLE';
    
    let profileData: any = targetProfileId && VOICE_PROFILES[targetProfileId]
      ? VOICE_PROFILES[targetProfileId]
      : getVoiceProfileByCountryAndGender(options?.countryId, options?.gender);

    if (profileData) {
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

      // 4. Appel de l'API Gemini TTS avec chunking
      const MAX_CHARS_PER_CHUNK = 2000;
      const scriptText = finalScript || script;
      const needsChunking = scriptText.length > MAX_CHARS_PER_CHUNK;

      const ttsConfig = {
        responseModalities: ["AUDIO"] as any,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: actualVoiceId,
            },
          },
        },
        // NOTE: temperature is intentionally NOT set for TTS.
        // Values below 0.5 cause Gemini TTS to return empty responses (documented behavior).
        // Voice consistency is enforced via the prompt VOICE IDENTITY LOCK instead.
      };

      // ── Production-grade retry: exponential backoff + jitter ─────────
      // Gemini TTS returns empty responses intermittently (finishReason OTHER/STOP).
      // Unique nonce prevents server-side caching causing silent failures.
      const requestNonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const promptWithNonce = fullPrompt + `\n<!-- req:${requestNonce} -->`;

      const callGeminiTTS = async (promptText: string): Promise<{ audioData: string; mimeType: string }> => {
        const MAX_ATTEMPTS = 5;
        let lastError: any;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const geminiResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-preview-tts',
              contents: [{ role: 'user', parts: [{ text: promptText }] }],
              // @ts-ignore
              config: ttsConfig,
            });

            const candidate = geminiResponse.candidates?.[0];
            const finishReason = candidate?.finishReason;
            const part = candidate?.content?.parts?.[0];
            const inlineAudio = (part as any)?.inlineData?.data;

            if (inlineAudio) {
              return {
                audioData: inlineAudio,
                mimeType: (part as any)?.inlineData?.mimeType || 'audio/L16;rate=24000',
              };
            }

            console.warn(`[AfriVoice] Attempt ${attempt}/${MAX_ATTEMPTS}: empty audio. finishReason=${finishReason}, voice=${actualVoiceId}`);
            lastError = new Error(`Empty audio (finishReason: ${finishReason})`);

          } catch (err: any) {
            if (err?.status === 400) throw err;
            console.warn(`[AfriVoice] Attempt ${attempt}/${MAX_ATTEMPTS}: API error: ${err?.message}`);
            lastError = err;
          }

          if (attempt < MAX_ATTEMPTS) {
            const base = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
            const jitter = Math.random() * 1000;
            await new Promise(r => setTimeout(r, Math.round(base + jitter)));
          }
        }

        throw lastError || new Error(`Gemini TTS failed after ${MAX_ATTEMPTS} attempts.`);
      };
      // ─────────────────────────────────────────────────────────────────

      try {
        if (!needsChunking) {
          // ── Short text: single call ──
          const result = await callGeminiTTS(promptWithNonce);
          audioData = result.audioData;
          mimeType = result.mimeType;

        } else {
          // ── Long text: split at sentence boundaries, generate each chunk ──
          console.log(`[AfriVoice] Long text (${scriptText.length} chars) → chunking into ~${MAX_CHARS_PER_CHUNK}-char segments.`);

          const sentences = scriptText.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [scriptText];
          const chunks: string[] = [];
          let currentChunk = '';
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length > MAX_CHARS_PER_CHUNK && currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          console.log(`[AfriVoice] Split into ${chunks.length} chunks.`);

          const audioChunks: string[] = [];
          for (let i = 0; i < chunks.length; i++) {
            // Build chunk-specific prompt using the compact brief base (replace transcript part)
            const chunkPrompt = fullPrompt.replace(
              /<transcript>[\s\S]*<\/transcript>/,
              `<transcript>\n${chunks[i]}\n</transcript>`
            ) + `\n<!-- chunk:${i + 1}/${chunks.length} req:${requestNonce} -->`;

            console.log(`[AfriVoice] Generating chunk ${i + 1}/${chunks.length}...`);
            const chunkResult = await callGeminiTTS(chunkPrompt);
            audioChunks.push(chunkResult.audioData);
            console.log(`[AfriVoice] Chunk ${i + 1}/${chunks.length} ✅`);
          }

          const combinedBuffer = Buffer.concat(audioChunks.map(b64 => Buffer.from(b64, 'base64')));
          audioData = combinedBuffer.toString('base64');
          mimeType = 'audio/L16;rate=24000';
          console.log(`[AfriVoice] All ${chunks.length} chunks merged. Total: ${combinedBuffer.length} bytes.`);
        }

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

    // Enregistrer l'événement dans la table voice_events pour le Dashboard Admin
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        let userId = null;
        let userEmail = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user) {
            userId = user.id;
            userEmail = user.email;
          }
        }

        await supabaseAdmin.from('voice_events').insert({
          user_id: userId,
          user_email: userEmail,
          country_id: options?.countryId || 'sn',
          country_name: options?.countryName || '',
          voice_id: voiceId || options?.voiceId || '',
          voice_persona: options?.voicePersona || options?.gender || '',
          gender: options?.gender || '',
          plan_id: options?.planId || 'free',
          content_style: options?.contentStyle || '',
          script_length: script.length,
          audio_duration_seconds: Math.round(script.length / 15),
          status: 'success',
          generation_id: generationId
        });
      } catch (logErr) {
        console.warn('[AfriVoice] Voice event logging failed (non-blocking):', logErr);
      }
    }

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
