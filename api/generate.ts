import { createClient } from "@supabase/supabase-js";
import { humanizeScript } from "./_lib/phonetic-humanizer/index.js";
// @ts-ignore
import { buildDirectorPrompt } from "./_lib/promptBuilder.js";
// @ts-ignore
import { VOICE_PROFILES, getVoiceProfileByCountryAndGender } from "./_lib/voiceProfiles.js";
// @ts-ignore
import { synthesizeWithGoogleVoiceClone } from "./_lib/googleTtsService.js";

// ══════════════════════════════════════════════════════════════════════
// POOL DE CLÉS GEMINI — dépasser la limite de 100 requêtes/jour (RPD)
// ──────────────────────────────────────────────────────────────────────
// Le quota de gemini-2.5-flash-preview-tts est appliqué PAR PROJET Google
// Cloud. Plusieurs clés issues de projets différents = plusieurs quotas,
// MAIS le même modèle et les mêmes voix → rendu audio strictement identique.
//
// Config (Vercel > Settings > Environment Variables) :
//   GEMINI_API_KEYS = cle_projet1,cle_projet2,cle_projet3   (virgules/retours ligne)
//   GEMINI_API_KEY  = clé historique (toujours supportée, ajoutée au pool)
//
// Fonctionnement :
//   1. Round-robin : la charge est répartie sur toutes les clés.
//   2. Sur 429 : la clé est mise en "cooldown" et on bascule immédiatement
//      sur la clé suivante — l'utilisateur ne voit rien.
//   3. Si toutes les clés sont épuisées → erreur 429 propre (quotaScope).
// ══════════════════════════════════════════════════════════════════════
class KeyQuotaError extends Error {
  scope: 'minute' | 'day' | 'unknown';
  retryAfterSec: number;
  constructor(scope: 'minute' | 'day' | 'unknown', retryAfterSec: number) {
    super('QUOTA_EXCEEDED');
    this.scope = scope;
    this.retryAfterSec = retryAfterSec;
  }
}

class KeyInvalidError extends Error {}

// Cooldown par clé (mémoire de l'instance serverless — suffisant : en cas de
// cold start, le pire cas est un essai supplémentaire qui renvoie 429).
const keyCooldowns = new Map<string, number>();
let rrCursor = 0;

const maskKey = (k: string) => `…${k.slice(-4)}`;

function buildKeyPool(customApiKey?: string): string[] {
  // Clé personnalisée fournie par l'utilisateur → utilisée seule, jamais mélangée au pool.
  if (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') {
    return [customApiKey.trim()];
  }
  const raw = [process.env.GEMINI_API_KEYS || '', process.env.GEMINI_API_KEY || ''].join(',');
  const keys = raw
    .split(/[\s,;]+/)
    .map(k => k.trim())
    .filter(k => k && k !== 'ta_cle_gemini_ici' && k !== 'PLACEHOLDER_API_KEY' && !k.startsWith('COLLE_TA_CLE'));
  return Array.from(new Set(keys));
}

/** Clés disponibles en round-robin d'abord, puis celles en cooldown (dernier recours, plus proche expiration en premier). */
function orderKeys(pool: string[]): string[] {
  const now = Date.now();
  const available = pool.filter(k => (keyCooldowns.get(k) || 0) <= now);
  const cooling = pool
    .filter(k => (keyCooldowns.get(k) || 0) > now)
    .sort((a, b) => (keyCooldowns.get(a) || 0) - (keyCooldowns.get(b) || 0));
  if (available.length > 1) {
    const start = rrCursor++ % available.length;
    return [...available.slice(start), ...available.slice(0, start), ...cooling];
  }
  return [...available, ...cooling];
}

function parseQuotaError(errText: string): KeyQuotaError {
  const isDay = /PerDay|per day|daily/i.test(errText);
  const retryMatch = errText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 0;
  if (isDay) return new KeyQuotaError('day', retrySec || 3600);
  if (/PerMinute|per minute/i.test(errText) || retrySec > 0) return new KeyQuotaError('minute', retrySec || 60);
  return new KeyQuotaError('unknown', 60);
}

async function callGeminiTtsWithKey(apiKey: string, promptText: string, voiceName: string, failFastOn429: boolean): Promise<{ audioData: string; mimeType: string }> {
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
        console.warn(`[AfriVoice] Gemini REST key ${maskKey(apiKey)} attempt ${attempt}/${MAX_ATTEMPTS} HTTP ${res.status}: ${errText.slice(0, 300)}`);

        if (res.status === 429) {
          const quotaErr = parseQuotaError(errText);
          // Quota journalier : inutile de réessayer cette clé. Avec un pool, on bascule tout de suite.
          if (failFastOn429 || quotaErr.scope === 'day') throw quotaErr;
          lastError = quotaErr;
        } else if (res.status === 401 || res.status === 403 || (res.status === 400 && /API key not valid|API_KEY_INVALID|API key expired/i.test(errText))) {
          // Clé invalide / suspendue / projet sans accès → autre clé du pool possible
          throw new KeyInvalidError(`Gemini API Error (${res.status}): ${errText}`);
        } else if (res.status === 400) {
          throw new Error(`Gemini API Error (${res.status}): ${errText}`);
        } else {
          lastError = new Error(`HTTP ${res.status}: ${errText}`);
        }
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
      if (err instanceof KeyQuotaError || err instanceof KeyInvalidError || err?.message?.includes("Gemini API Error")) {
        throw err;
      }
      console.warn(`[AfriVoice] Gemini REST attempt ${attempt}/${MAX_ATTEMPTS} error: ${err?.message}`);
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }

  if (lastError instanceof KeyQuotaError) throw lastError;
  throw lastError || new Error(`Génération Gemini TTS échouée après ${MAX_ATTEMPTS} tentatives.`);
}

async function callGeminiTtsRest(pool: string[], promptText: string, voiceName: string): Promise<{ audioData: string; mimeType: string }> {
  const keys = orderKeys(pool);
  const hasFailover = keys.length > 1;
  let lastQuotaError: KeyQuotaError | undefined;
  let lastInvalidError: KeyInvalidError | undefined;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const result = await callGeminiTtsWithKey(key, promptText, voiceName, hasFailover);
      keyCooldowns.delete(key);
      if (i > 0) console.log(`[AfriVoice] ✅ Failover réussi sur la clé ${maskKey(key)} (${i} clé(s) saturée(s) évitée(s)).`);
      return result;
    } catch (err: any) {
      if (err instanceof KeyQuotaError) {
        // day → on recontrôle dans 30 min (le quota se réinitialise à minuit heure Pacifique)
        const cooldownMs = err.scope === 'day' ? 30 * 60_000 : Math.max(err.retryAfterSec, 5) * 1000;
        keyCooldowns.set(key, Date.now() + cooldownMs);
        lastQuotaError = err;
        console.warn(`[AfriVoice] ⚠️ Clé ${maskKey(key)} saturée (${err.scope}) → cooldown ${Math.round(cooldownMs / 1000)}s. ${i + 1 < keys.length ? 'Bascule sur la clé suivante…' : 'Plus aucune clé disponible.'}`);
        continue;
      }
      if (err instanceof KeyInvalidError) {
        keyCooldowns.set(key, Date.now() + 10 * 60_000);
        lastInvalidError = err;
        console.error(`[AfriVoice] ❌ Clé ${maskKey(key)} invalide/refusée — ignorée 10 min.`);
        if (i + 1 < keys.length) continue;
        break;
      }
      throw err; // erreur non liée à la clé (400 prompt, réseau, audio vide…) → on ne change pas de clé
    }
  }

  if (lastQuotaError) throw lastQuotaError;
  if (lastInvalidError) throw lastInvalidError;
  throw new Error(`Génération Gemini TTS échouée.`);
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

    // Pool de clés (GEMINI_API_KEYS + GEMINI_API_KEY) — ou clé perso utilisateur seule
    const keyPool = buildKeyPool(customApiKey);

    if (keyPool.length === 0) {
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
        const result = await callGeminiTtsRest(keyPool, promptWithNonce, actualVoiceId);
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

          const chunkResult = await callGeminiTtsRest(keyPool, chunkPrompt, actualVoiceId);
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
    // Toutes les clés du pool sont saturées → 429 propre (le frontend affiche le bon message)
    if (error instanceof KeyQuotaError) {
      console.error(`[AfriVoice] 🚨 TOUT LE POOL EST SATURÉ (${error.scope}). Ajoutez des clés dans GEMINI_API_KEYS.`);
      res.setHeader('Retry-After', String(error.retryAfterSec));
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        quotaScope: error.scope,
        retryAfterSec: error.retryAfterSec,
      });
    }
    console.error('[AfriVoice] Handler Error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Erreur interne lors de la génération audio.',
      errorType: error?.constructor?.name || 'UnknownError',
    });
  }
}
