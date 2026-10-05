import { createClient } from "@supabase/supabase-js";
import { humanizeScript } from "./_lib/phonetic-humanizer/index.js";
// @ts-ignore
import { buildDirectorPrompt } from "./_lib/promptBuilder.js";
// @ts-ignore
import { VOICE_PROFILES, getVoiceProfileByCountryAndGender } from "./_lib/voiceProfiles.js";
// @ts-ignore
import { synthesizeWithGoogleVoiceClone } from "./_lib/googleTtsService.js";

class GeminiQuotaError extends Error {
  scope: 'minute' | 'day' | 'unknown';
  retryAfterSec: number;
  constructor(scope: 'minute' | 'day' | 'unknown', retryAfterSec: number, detail: string) {
    super(`QUOTA_EXCEEDED(${scope}): ${detail}`);
    this.name = 'GeminiQuotaError';
    this.scope = scope;
    this.retryAfterSec = retryAfterSec;
  }
}

// Analyse le corps d'une erreur 429 Google pour savoir si c'est un quota par minute ou par jour.
function parseGeminiQuota(errText: string, headerRetryAfter?: string | null): GeminiQuotaError {
  let scope: 'minute' | 'day' | 'unknown' = 'unknown';
  let retryAfterSec = Number(headerRetryAfter) || 0;
  try {
    const parsed = JSON.parse(errText);
    const details: any[] = parsed?.error?.details || [];
    for (const d of details) {
      for (const v of d?.violations || []) {
        const id = String(v?.quotaId || '');
        if (/PerDay/i.test(id)) scope = 'day';
        else if (/PerMinute/i.test(id) && scope !== 'day') scope = 'minute';
      }
      if (typeof d?.retryDelay === 'string') {
        retryAfterSec = Math.max(retryAfterSec, parseInt(d.retryDelay, 10) || 0);
      }
    }
  } catch { /* corps non JSON */ }
  return new GeminiQuotaError(scope, retryAfterSec, errText.slice(0, 300));
}

// ── Chaîne de secours TTS ───────────────────────────────────────────────
// Chaque modèle a SON PROPRE quota journalier (ex. 100/jour/modèle en Tier 1).
// Quand un modèle renvoie 429, on bascule sur le suivant. On n'utilise que des modèles
// qui acceptent le prompt "directeur" en texte libre (pas la série 3.8, qui lirait
// le brief à voix haute car elle traite l'entrée comme une transcription stricte).
// Surchargeable : GEMINI_TTS_MODELS="modelA,modelB,modelC"
const envModels = (process.env.GEMINI_TTS_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);
const TTS_MODELS: string[] = envModels.length > 0
  ? envModels
  : ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts'];

// Mémoire (par instance serverless) des modèles dont le quota est épuisé, pour ne pas
// gaspiller une requête à chaque génération.
const modelBlockedUntil = new Map<string, number>();

async function callGeminiTtsRest(apiKey: string, promptText: string, voiceName: string): Promise<{ audioData: string; mimeType: string }> {
  let lastQuotaError: GeminiQuotaError | undefined;
  const now = Date.now();
  // Si tous les modèles sont marqués épuisés, on les retente quand même (la mémoire peut être périmée).
  const available = TTS_MODELS.filter(m => (modelBlockedUntil.get(m) || 0) <= now);
  const candidates = available.length > 0 ? available : TTS_MODELS;

  for (const model of candidates) {
    try {
      const result = await callGeminiTtsModel(model, apiKey, promptText, voiceName);
      console.log(`[AfriVoice] Audio généré avec le modèle ${model}.`);
      return result;
    } catch (err: any) {
      if (err instanceof GeminiQuotaError) {
        const waitMs = (err.scope === 'day' ? Math.max(err.retryAfterSec, 600) : Math.max(err.retryAfterSec, 30)) * 1000;
        modelBlockedUntil.set(model, Date.now() + waitMs);
        console.warn(`[AfriVoice] Quota épuisé (${err.scope}) pour ${model} → bascule sur le modèle suivant.`);
        lastQuotaError = err;
        continue;
      }
      // Modèle indisponible pour ce projet : on essaie le suivant plutôt que d'échouer.
      if (typeof err?.message === 'string' && /HTTP 404|Gemini API Error \(404\)|not found/i.test(err.message)) {
        console.warn(`[AfriVoice] Modèle ${model} indisponible → bascule sur le modèle suivant.`);
        continue;
      }
      throw err;
    }
  }
  if (lastQuotaError) throw lastQuotaError;
  throw new Error('Aucun modèle de synthèse vocale disponible.');
}

async function callGeminiTtsModel(model: string, apiKey: string, promptText: string, voiceName: string): Promise<{ audioData: string; mimeType: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        if (res.status === 429) {
          // Un retry immédiat sur 429 ne sert à rien et consomme encore du quota.
          throw parseGeminiQuota(errText, res.headers.get('retry-after'));
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
      if (err instanceof GeminiQuotaError || err?.message?.includes("Gemini API Error")) {
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
    const keySource: 'browser' | 'server' = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') ? 'browser' : 'server';
    console.log(`[AfriVoice] Clé Gemini utilisée : source=${keySource}, se termine par ...${apiKey.slice(-4)}`);

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
      // ══════════════════════════════════════════════════════════════
      // STRATÉGIE ANTI-CASSURE VOCALE (3 couches)
      // ──────────────────────────────────────────────────────────────
      // Couche 1 : Maximiser la taille du chunk → 5500 chars (~6 min)
      //            pour éviter tout découpage dans 95% des cas.
      // Couche 2 : Ancrage vocal contextuel → les 2 dernières phrases
      //            du chunk précédent sont passées comme "contexte déjà
      //            prononcé" (non lu à voix haute) pour que Gemini
      //            cale son timbre sur la continuité.
      // Couche 3 : Micro-fondu PCM de 30ms aux jointures pour
      //            éliminer les clics/pops entre les morceaux.
      // ══════════════════════════════════════════════════════════════
      const MAX_CHARS_PER_CHUNK = 5500;
      const scriptText = finalScript || script;
      const needsChunking = scriptText.length > MAX_CHARS_PER_CHUNK;
      const requestNonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const promptWithNonce = fullPrompt + `\n<!-- req:${requestNonce} -->`;

      if (!needsChunking) {
        const result = await callGeminiTtsRest(apiKey, promptWithNonce, actualVoiceId);
        audioData = result.audioData;
        mimeType = result.mimeType;
      } else {
        // ── Découpage intelligent par phrases ──
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

        console.log(`[AfriVoice] Texte long (${scriptText.length} chars) découpé en ${chunks.length} chunks.`);

        // ── Extraction des phrases d'ancrage vocal ──
        // Pour chaque chunk après le premier, on extrait les 2 dernières phrases
        // du chunk précédent pour servir de "voix de référence"
        const extractLastSentences = (text: string, count: number = 2): string => {
          const s = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [];
          return s.slice(-count).join(' ').trim();
        };

        const audioBuffers: Buffer[] = [];
        for (let i = 0; i < chunks.length; i++) {
          // ── Couche 2 : Ancrage vocal contextuel ──
          let voiceAnchor = '';
          if (i > 0) {
            const previousContext = extractLastSentences(chunks[i - 1]);
            voiceAnchor = `\n<voice_reference_context>\nYou have ALREADY spoken the following text with your voice. DO NOT read this aloud. Use it ONLY to maintain the exact same voice tone, pitch, rhythm, speed and accent for what follows:\n"${previousContext}"\n</voice_reference_context>\nCRITICAL: Continue with the EXACT SAME voice — same pitch, same pace, same energy, same accent intensity. This is a seamless continuation of the same recording session.`;
          }

          const chunkPrompt = fullPrompt.replace(
            /<transcript>[\s\S]*<\/transcript>/,
            `<transcript>\n${chunks[i]}\n</transcript>`
          ) + voiceAnchor + `\n<!-- chunk:${i + 1}/${chunks.length} req:${requestNonce} -->`;

          const chunkResult = await callGeminiTtsRest(apiKey, chunkPrompt, actualVoiceId);
          audioBuffers.push(Buffer.from(chunkResult.audioData, 'base64'));
          console.log(`[AfriVoice] Chunk ${i + 1}/${chunks.length} généré (${audioBuffers[i].length} bytes).`);
        }

        // ── Couche 3 : Micro-fondu PCM aux jointures ──
        // L16 = 16-bit signed LE, mono, 24kHz
        // 30ms = 720 samples = 1440 bytes — assez court pour ne pas affecter
        // la parole, assez long pour éliminer les clics/pops
        const FADE_SAMPLES = 720; // 30ms at 24kHz
        const BYTES_PER_SAMPLE = 2;
        const FADE_BYTES = FADE_SAMPLES * BYTES_PER_SAMPLE;

        for (let i = 0; i < audioBuffers.length; i++) {
          const buf = audioBuffers[i];
          const totalSamples = buf.length / BYTES_PER_SAMPLE;
          if (totalSamples < FADE_SAMPLES * 2) continue; // trop court

          // Fade-in sur le premier chunk n'est pas nécessaire (début du texte)
          // Fade-in sur les chunks suivants pour lisser la jointure
          if (i > 0) {
            for (let s = 0; s < FADE_SAMPLES; s++) {
              const gain = s / FADE_SAMPLES;
              const offset = s * BYTES_PER_SAMPLE;
              const sample = buf.readInt16LE(offset);
              buf.writeInt16LE(Math.round(sample * gain), offset);
            }
          }

          // Fade-out sur tous les chunks sauf le dernier (fin du texte)
          if (i < audioBuffers.length - 1) {
            for (let s = 0; s < FADE_SAMPLES; s++) {
              const gain = 1 - (s / FADE_SAMPLES);
              const offset = (totalSamples - FADE_SAMPLES + s) * BYTES_PER_SAMPLE;
              const sample = buf.readInt16LE(offset);
              buf.writeInt16LE(Math.round(sample * gain), offset);
            }
          }
        }

        const combinedBuffer = Buffer.concat(audioBuffers);
        audioData = combinedBuffer.toString('base64');
        mimeType = 'audio/L16;rate=24000';
        console.log(`[AfriVoice] ${chunks.length} chunks assemblés avec ancrage vocal + fondu PCM. Total: ${combinedBuffer.length} bytes.`);
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
    if (error instanceof GeminiQuotaError) {
      if (error.retryAfterSec > 0) res.setHeader('Retry-After', String(error.retryAfterSec));
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        quotaScope: error.scope,
        retryAfterSec: error.retryAfterSec,
      });
    }
    return res.status(500).json({
      error: error?.message || 'Erreur interne lors de la génération audio.',
      errorType: error?.constructor?.name || 'UnknownError',
    });
  }
}
