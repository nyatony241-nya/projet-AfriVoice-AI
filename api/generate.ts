import { createClient } from "@supabase/supabase-js";
import { humanizeScript } from "./_lib/phonetic-humanizer/index.js";
// @ts-ignore
import { buildDirectorPrompt } from "./_lib/promptBuilder.js";
// @ts-ignore
import { VOICE_PROFILES, getVoiceProfileByCountryAndGender } from "./_lib/voiceProfiles.js";
// @ts-ignore
import { synthesizeWithGoogleVoiceClone } from "./_lib/googleTtsService.js";

async function callGeminiTtsRest(apiKey: string, promptText: string, voiceName: string): Promise<{ audioData: string; mimeType: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  const MAX_ATTEMPTS = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName || "Aoede"
                }
              }
            }
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[AfriVoice] Gemini REST attempt ${attempt}/${MAX_ATTEMPTS} HTTP ${res.status}: ${errText}`);
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(`Gemini API Error (${res.status}): ${errText}`);
        }
        lastError = new Error(`HTTP ${res.status}: ${errText}`);
      } else {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        const inlineAudio = part?.inlineData?.data;

        if (inlineAudio) {
          return {
            audioData: inlineAudio,
            mimeType: part?.inlineData?.mimeType || 'audio/L16;rate=24000',
          };
        }
        console.warn(`[AfriVoice] Gemini REST attempt ${attempt}/${MAX_ATTEMPTS}: audio vide reçue (finishReason: ${candidate?.finishReason}).`);
        lastError = new Error(`Audio vide (finishReason: ${candidate?.finishReason})`);
      }
    } catch (err: any) {
      if (err?.message?.includes("Gemini API Error")) {
        throw err;
      }
      console.warn(`[AfriVoice] Gemini REST attempt ${attempt}/${MAX_ATTEMPTS} error: ${err?.message}`);
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }

  throw lastError || new Error(`Génération Gemini TTS échouée après ${MAX_ATTEMPTS} tentatives.`);
}

export default async function handler(req: any, res: any) {
  // ── CORS restrictif — uniquement le domaine de production et localhost ──
  const ALLOWED_ORIGINS = [
    'https://afrivoice.site',
    'https://www.afrivoice.site',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const requestOrigin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { script, voiceId, customApiKey, options, voiceProfileId } = req.body || {};

    if (!script) {
      return res.status(400).json({ error: "Le paramètre 'script' est requis." });
    }

    const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
      ? customApiKey.trim() 
      : (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');

    if (!apiKey || apiKey === 'ta_cle_gemini_ici') {
      return res.status(401).json({ error: "Aucune clé API Gemini configurée." });
    }

    // ── Authentification obligatoire ─────────────────────────────────────
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: "Service d'authentification indisponible." });
    }
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Token d'authentification manquant." });
    }
    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Token d'authentification invalide ou expiré." });
    }

    // 1. Humanisation Phonétique du script si demandée
    const finalScript = options?.phoneticHumanizer
      ? humanizeScript(script, options.countryId, { contentStyle: options.contentStyle, emotion: options.emotion })
      : script;

    // 2. Résolution des profils vocaux
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

      // 3. Construction du prompt
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

      // 4. Appel de l'API Gemini TTS native REST avec chunking
      const MAX_CHARS_PER_CHUNK = 2000;
      const scriptText = finalScript || script;
      const needsChunking = scriptText.length > MAX_CHARS_PER_CHUNK;
      const requestNonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const promptWithNonce = fullPrompt + `\n<!-- req:${requestNonce} -->`;

      if (!needsChunking) {
        const result = await callGeminiTtsRest(apiKey, promptWithNonce, actualVoiceId);
        audioData = result.audioData;
        mimeType = result.mimeType;
      } else {
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

        const audioChunks: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkPrompt = fullPrompt.replace(
            /<transcript>[\s\S]*<\/transcript>/,
            `<transcript>\n${chunks[i]}\n</transcript>`
          ) + `\n<!-- chunk:${i + 1}/${chunks.length} req:${requestNonce} -->`;

          const chunkResult = await callGeminiTtsRest(apiKey, chunkPrompt, actualVoiceId);
          audioChunks.push(chunkResult.audioData);
        }

        const combinedBuffer = Buffer.concat(audioChunks.map(b64 => Buffer.from(b64, 'base64')));
        audioData = combinedBuffer.toString('base64');
        mimeType = 'audio/L16;rate=24000';
      }
    }

    if (!audioData) {
      return res.status(500).json({ error: 'Aucune donnée audio reçue de la synthèse.' });
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
    console.error('[AfriVoice] Handler Error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Erreur interne lors de la génération audio.',
      errorType: error?.constructor?.name || 'UnknownError',
    });
  }
}
