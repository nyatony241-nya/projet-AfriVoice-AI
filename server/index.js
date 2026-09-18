import express from 'express';
import cors from 'cors';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { humanizeScript } from '../services/phonetic-humanizer/index';
import { buildDirectorPrompt } from '../services/promptBuilder';
import { VOICE_PROFILES, getVoiceProfileByCountryAndGender } from '../services/voiceProfiles';
import { synthesizeWithGoogleVoiceClone } from '../services/googleTtsService';
import { getAvailablePaymentMethods } from '../services/paymentConfig.js';
import { routePayment } from '../services/paymentRouter.js';
import { validateUserLicense, getQuotaForPlan } from '../services/licenseManager.js';
import * as paystackProvider from '../services/providers/paystackProvider.js';
import * as chariowProvider from '../services/providers/chariowProvider.js';
import { sendReminderEmail, sendConversionEmail } from '../services/emailService.js';

dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const app = express();
const PORT = process.env.PORT || 3006;

// CORS restreint aux origines légitimes
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // En développement, accepter tous les localhost (port dynamique Vite)
    if (!origin || ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    keyConfigured: !!(process.env.GEMINI_API_KEY),
    engine: 'VoicePromptEngine v3 — AI Voice Director (Deterministic)'
  });
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const verifyAuthToken = async (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({ error: "Service d'authentification indisponible. Configurez les variables Supabase." });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Token d'authentification manquant." });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Token d'authentification invalide ou expiré." });
  }
  req.user = data.user;
  next();
};

// ══════════════════════════════════════════════════════════════
// API ENDPOINT — Voice Generation (Deterministic)
// ══════════════════════════════════════════════════════════════

app.post('/api/generate', generateLimiter, verifyAuthToken, async (req, res) => {
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
    // ── Vérification Plan + Trial (Anti-Contournement Serveur) ──
    try {
      if (supabase && req.user?.email) {
        const { data: quotaData, error: quotaError } = await supabase
          .from('user_quotas')
          .select('monthly_limit, trial_used')
          .eq('email', req.user.email)
          .maybeSingle();

        if (!quotaError && quotaData) {
          const monthlyLimit = quotaData?.monthly_limit ?? 0;
          const isPaidPlan = monthlyLimit >= 600; // Starter = 600s minimum
          const trialUsed = quotaData?.trial_used === true;

          if (!isPaidPlan) {
            if (trialUsed) {
              return res.status(403).json({ error: 'Essai gratuit déjà utilisé. Veuillez souscrire à un forfait AfriVoice pour continuer.' });
            }
            // Trial disponible : limiter le script
            if (script && script.length > 220) {
              return res.status(403).json({ error: "Limite d'essai gratuit : 200 caractères maximum. Abonnez-vous pour lever cette limite." });
            }
          }
        } else if (quotaError) {
          console.warn('[Trial Check] Erreur (non-bloquante):', quotaError.message);
        }
      }
    } catch (trialErr) {
      console.warn('[Trial Check] Exception (non-bloquante):', trialErr.message);
      // Ne pas bloquer la génération si la vérification trial échoue
    }

    // 1. Humanisation Phonétique du script si demandée
    const finalScript = options?.phoneticHumanizer
      ? humanizeScript(script, options.countryId, { contentStyle: options.contentStyle, emotion: options.emotion })
      : script;

    // 2. Vérification et résolution dynamique des profils vocaux pour les 19 pays
    const targetProfileId = voiceProfileId || options?.voiceProfileId;
    let voiceCloningKey = '';
    let isReplicationAttempted = false;
    let replicationStatus = 'VOICE_REPLICATION_UNAVAILABLE';
    
    let profileData = targetProfileId && VOICE_PROFILES[targetProfileId]
      ? VOICE_PROFILES[targetProfileId]
      : getVoiceProfileByCountryAndGender(options?.countryId, options?.gender);

    if (profileData) {
      if (process.env.ENABLE_VOICE_REPLICATION === 'true' && profileData.provider === 'google' && profileData.voiceCloningKey) {
        voiceCloningKey = profileData.voiceCloningKey;
        isReplicationAttempted = true;
      }
    }

    let audioData;
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
      } catch (replicationError) {
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

      if (!global.aiClientCache) {
        global.aiClientCache = new Map();
      }
      if (!global.aiClientCache.has(apiKey)) {
        global.aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
      }
      const ai = global.aiClientCache.get(apiKey);

      // ── Smart Chunking for Long Texts ──
      // ══════════════════════════════════════════════════════════════
      // STRATÉGIE ANTI-CASSURE VOCALE (3 couches)
      // Couche 1 : chunk 5500 chars (~6 min) pour minimiser le découpage
      // Couche 2 : ancrage vocal contextuel (dernières phrases du chunk précédent)
      // Couche 3 : micro-fondu PCM 30ms aux jointures
      // ══════════════════════════════════════════════════════════════
      const MAX_CHARS_PER_CHUNK = 5500;
      const scriptText = finalScript || script;
      const needsChunking = scriptText.length > MAX_CHARS_PER_CHUNK;

      const ttsConfig = {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: actualVoiceId,
            },
          },
        },
        // NOTE: temperature intentionally omitted — values <0.5 cause Gemini TTS to return empty audio.
        // Voice consistency is enforced via the prompt VOICE IDENTITY LOCK instead.
      };

      if (!needsChunking) {
        // Single generation for short texts
        const genWithRetry = async (attempt = 1) => {
          try {
            return await ai.models.generateContent({
              model: 'gemini-2.5-flash-preview-tts',
              contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
              config: ttsConfig,
            });
          } catch (err) {
            if (attempt < 3) {
              console.warn(`[AfriVoice] TTS attempt ${attempt} failed, retrying in ${attempt * 2}s...`);
              await new Promise(r => setTimeout(r, attempt * 2000));
              return genWithRetry(attempt + 1);
            }
            throw err;
          }
        };
        const response = await genWithRetry();
        const candidate = response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const part = candidate?.content?.parts?.[0];
        const inlineAudio = part?.inlineData?.data;
        if (!inlineAudio) {
          console.error(`[AfriVoice] Empty audio. finishReason=${finishReason}, voice=${actualVoiceId}`);
          throw new Error(`Gemini TTS returned no audio (finishReason: ${finishReason}). Veuillez réessayer.`);
        }
        audioData = inlineAudio;
        mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';
      } else {
        // Chunked generation for long texts
        console.log(`[AfriVoice] Texte long (${scriptText.length} chars). Découpage en chunks de ~${MAX_CHARS_PER_CHUNK} chars.`);
        
        // Split at sentence boundaries
        const sentences = scriptText.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [scriptText];
        const chunks = [];
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

        console.log(`[AfriVoice] Découpé en ${chunks.length} chunks.`);

        // ── Couche 2 : Ancrage vocal contextuel ──
        const extractLastSentences = (text, count = 2) => {
          const s = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [];
          return s.slice(-count).join(' ').trim();
        };
        
        // Generate audio for each chunk with voice anchoring
        const audioBuffers = [];
        for (let i = 0; i < chunks.length; i++) {
          let voiceAnchor = '';
          if (i > 0) {
            const previousContext = extractLastSentences(chunks[i - 1]);
            voiceAnchor = `\n<voice_reference_context>\nYou have ALREADY spoken the following text with your voice. DO NOT read this aloud. Use it ONLY to maintain the exact same voice tone, pitch, rhythm, speed and accent for what follows:\n"${previousContext}"\n</voice_reference_context>\nCRITICAL: Continue with the EXACT SAME voice — same pitch, same pace, same energy, same accent intensity. This is a seamless continuation of the same recording session.`;
          }

          const chunkPrompt = fullPrompt.replace(
            /<transcript>[\s\S]*<\/transcript>/,
            `<transcript>\n${chunks[i]}\n</transcript>`
          ) + voiceAnchor;
          
          const genChunkWithRetry = async (attempt = 1) => {
            try {
              return await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ role: 'user', parts: [{ text: chunkPrompt }] }],
                config: ttsConfig,
              });
            } catch (err) {
              if (attempt < 3) {
                console.warn(`[AfriVoice] Chunk ${i + 1}/${chunks.length} attempt ${attempt} failed, retrying...`);
                await new Promise(r => setTimeout(r, attempt * 2000));
                return genChunkWithRetry(attempt + 1);
              }
              throw err;
            }
          };

          const chunkResponse = await genChunkWithRetry();
          const chunkCandidate = chunkResponse.candidates?.[0];
          const chunkFinishReason = chunkCandidate?.finishReason;
          const chunkPart = chunkCandidate?.content?.parts?.[0];
          const chunkAudio = chunkPart?.inlineData?.data;
          if (!chunkAudio) {
            console.error(`[AfriVoice] Chunk ${i+1}/${chunks.length} empty. finishReason=${chunkFinishReason}`);
            throw new Error(`Chunk ${i + 1}/${chunks.length} returned no audio (finishReason: ${chunkFinishReason})`);
          }
          audioBuffers.push(Buffer.from(chunkAudio, 'base64'));
          console.log(`[AfriVoice] Chunk ${i + 1}/${chunks.length} généré (${audioBuffers[i].length} bytes).`);
        }

        // ── Couche 3 : Micro-fondu PCM aux jointures ──
        // L16 = 16-bit signed LE, mono, 24kHz
        // 30ms = 720 samples = 1440 bytes
        const FADE_SAMPLES = 720;
        const BYTES_PER_SAMPLE = 2;

        for (let i = 0; i < audioBuffers.length; i++) {
          const buf = audioBuffers[i];
          const totalSamples = buf.length / BYTES_PER_SAMPLE;
          if (totalSamples < FADE_SAMPLES * 2) continue;

          // Fade-in sur les chunks après le premier
          if (i > 0) {
            for (let s = 0; s < FADE_SAMPLES; s++) {
              const gain = s / FADE_SAMPLES;
              const offset = s * BYTES_PER_SAMPLE;
              const sample = buf.readInt16LE(offset);
              buf.writeInt16LE(Math.round(sample * gain), offset);
            }
          }

          // Fade-out sur tous les chunks sauf le dernier
          if (i < audioBuffers.length - 1) {
            for (let s = 0; s < FADE_SAMPLES; s++) {
              const gain = 1 - (s / FADE_SAMPLES);
              const offset = (totalSamples - FADE_SAMPLES + s) * BYTES_PER_SAMPLE;
              const sample = buf.readInt16LE(offset);
              buf.writeInt16LE(Math.round(sample * gain), offset);
            }
          }
        }

        // Concatenate all PCM audio chunks
        const combinedBuffer = Buffer.concat(audioBuffers);
        audioData = combinedBuffer.toString('base64');
        mimeType = 'audio/L16;rate=24000';
        console.log(`[AfriVoice] ${chunks.length} chunks assemblés avec ancrage vocal + fondu PCM. Total: ${combinedBuffer.length} bytes.`);
      }
    }

    if (!audioData) {
      throw new Error("Aucune donnée audio générée");
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Audio généré — mimeType: ${mimeType}, taille: ${audioData.length} chars`);
    }

    // ── Marquer le trial comme utilisé côté serveur si non-abonné ──
    if (supabase && req.user?.email) {
      const { data: quotaCheck } = await supabase
        .from('user_quotas')
        .select('monthly_limit, trial_used')
        .eq('email', req.user.email)
        .maybeSingle();

      const isPaidPlan = (quotaCheck?.monthly_limit ?? 0) >= 600;
      if (!isPaidPlan && !quotaCheck?.trial_used) {
        await supabase
          .from('user_quotas')
          .update({ trial_used: true, trial_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('email', req.user.email);
        console.log(`[AfriVoice Trial] ✅ trial_used marqué pour ${req.user.email}`);
      }
    }

    return res.json({ base64Audio: audioData, mimeType, metadata });

  } catch (error) {
    console.error("❌ Erreur de génération:", error.message || 'Erreur interne');
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).`
    });
  }
});

// ══════════════════════════════════════════════════════════════
// API ENDPOINTS — Payment System
// ══════════════════════════════════════════════════════════════

app.get('/api/payment/methods/:countryId', (req, res) => {
  const { countryId } = req.params;
  const methods = getAvailablePaymentMethods(countryId);
  res.json({ methods });
});

app.post('/api/payment/checkout', verifyAuthToken, async (req, res) => {
  const { planId, countryId, paymentMethod, successUrl, cancelUrl } = req.body;
  const user = req.user;

  try {
    const result = await routePayment(
      countryId,
      planId,
      user.email,
      paymentMethod,
      successUrl,
      cancelUrl
    );
    res.json(result);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message || 'Payment routing failed.' });
  }
});

app.post('/api/payment/verify', verifyAuthToken, async (req, res) => {
  const { provider, reference } = req.body;
  try {
    // Basic implementation for Paystack. Expand based on provider
    if (provider === 'paystack') {
      const result = await paystackProvider.verifyPayment(reference);
      res.json(result);
    } else {
      res.status(400).json({ error: `Verification not fully implemented for ${provider}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

app.post('/api/license/validate', verifyAuthToken, async (req, res) => {
  const { licenseKey } = req.body;
  try {
    const license = await validateUserLicense(licenseKey);
    const quota = getQuotaForPlan(license.planId);
    res.json({ license, quota });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired license.' });
  }
});

// Webhooks
app.post('/api/webhooks/chariow', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-chariow-signature'];
  const isValid = chariowProvider.verifyWebhookSignature(req.body, signature, process.env.CHARIOW_WEBHOOK_SECRET);
  if (!isValid) return res.status(401).send('Invalid signature');
  
  // Process webhook
  res.status(200).send('OK');
});

app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res) => {
  // Process Paystack webhook
  res.status(200).send('OK');
});

app.post('/api/webhooks/pawapay', express.raw({ type: 'application/json' }), (req, res) => {
  // Process PawaPay webhook
  res.status(200).send('OK');
});

// ══════════════════════════════════════════════════════════════
// CRON JOBS — Email Follow-ups
// ══════════════════════════════════════════════════════════════

app.post('/api/cron/email-followups', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase indisponible' });
  }

  console.log('⏰ Début de la tâche cron: Email Follow-ups');
  let sentReminders = 0;
  let sentConversions = 0;

  try {
    // 1. Cible 1 : Inscrits il y a > 24h, n'ont pas utilisé l'essai, email non envoyé
    // Note: requires join or checking profiles created_at, but we can just use user_quotas updated_at if we assume it's created at signup.
    // To be precise, let's query my_account view or users if possible, or just user_quotas based on created_at.
    // Wait, user_quotas doesn't have created_at. Let's use profiles table created_at.
    const { data: reminderTargets, error: err1 } = await supabase
      .from('user_quotas')
      .select('email, trial_used, reminder_email_sent')
      .eq('trial_used', false)
      .eq('reminder_email_sent', false);

    if (err1) console.error('Erreur requete reminderTargets:', err1);
    
    // We don't have created_at in user_quotas, so we'll just check if they exist. To avoid sending instantly after signup, 
    // ideally we'd join with profiles, but for simplicity we fetch all and check their profiles.
    if (reminderTargets && reminderTargets.length > 0) {
      for (const target of reminderTargets) {
        const { data: profile } = await supabase.from('profiles').select('created_at, full_name').eq('email', target.email).single();
        if (profile) {
          const hoursSinceSignup = (new Date() - new Date(profile.created_at)) / (1000 * 60 * 60);
          if (hoursSinceSignup >= 24) {
            const success = await sendReminderEmail(target.email, profile.full_name || 'Créateur');
            if (success) {
              await supabase.from('user_quotas').update({ reminder_email_sent: true }).eq('email', target.email);
              sentReminders++;
            }
          }
        }
      }
    }

    // 2. Cible 2 : Ont utilisé l'essai il y a > 24h, pas abonnés, email non envoyé
    const { data: conversionTargets, error: err2 } = await supabase
      .from('user_quotas')
      .select('email, trial_used, trial_used_at, monthly_limit, conversion_email_sent')
      .eq('trial_used', true)
      .eq('conversion_email_sent', false)
      .lt('monthly_limit', 600) // Not subscribed
      .not('trial_used_at', 'is', null);

    if (err2) console.error('Erreur requete conversionTargets:', err2);

    if (conversionTargets && conversionTargets.length > 0) {
      for (const target of conversionTargets) {
        const hoursSinceTrial = (new Date() - new Date(target.trial_used_at)) / (1000 * 60 * 60);
        if (hoursSinceTrial >= 24) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('email', target.email).single();
          const success = await sendConversionEmail(target.email, profile?.full_name || 'Créateur');
          if (success) {
            await supabase.from('user_quotas').update({ conversion_email_sent: true }).eq('email', target.email);
            sentConversions++;
          }
        }
      }
    }

    console.log(`✅ Cron terminé : ${sentReminders} rappels, ${sentConversions} conversions envoyés.`);
    res.json({ success: true, sentReminders, sentConversions });

  } catch (err) {
    console.error('❌ Erreur générale cron:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AfriVoice AI Voice Director v3 — port ${PORT}`);
  console.log(`🎯 Moteur: Narrative-Driven Director → Voice DNA (19 pays) → Scene-Based Prompts (Déterministe)`);
  console.log(`🔑 Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configurée' : '❌ NON CONFIGURÉE!'}`);
});
