import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { humanizeScript } from "../services/phonetic-humanizer/index.js";
// @ts-ignore
import { buildDirectorPrompt } from "../services/promptBuilder.js";

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
    const { script, voiceId, customApiKey, options } = body;

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

    // Validation Supabase optionnelle (quota de sécurité client-side)
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
            console.warn('[AfriVoice] Auth token invalid/expired — continuing (quota managed client-side):', error?.message);
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

    // 2. Construction chirurgicale du prompt à partir de la source de vérité partagée
    const { directorBrief: fullPrompt, actualVoiceId, voiceSeed } = buildDirectorPrompt({
      script,
      countryId: options?.countryId,
      countryName: options?.countryName || "Côte d'Ivoire",
      gender: options?.gender || 'female',
      age: options?.age || 30,
      voiceVariant: options?.voiceVariant || voiceId,
      accentLevel: options?.accentLevel || 'strong',
      useLocalExpressions: options?.useLocalExpressions,
      emotion: options?.emotion,
      contentStyle: options?.contentStyle,
      personality: options?.personality,
      vocalObjective: options?.vocalObjective,
      speed: options?.speed,
      pitch: options?.pitch,
      phoneticScript: finalScript,
    });

    const ai = getAiClient(apiKey);

    // 3. Appel de l'API Gemini TTS avec gestion d'erreurs enrichie et configuration déterministe
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
          temperature: 0.5,
          seed: voiceSeed,
        },
      });
    } catch (apiError: any) {
      console.error('[AfriVoice] Gemini API call failed:', apiError);
      
      // Détection des erreurs d'authentification (clé invalide / expirée)
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
    const audioData = (part as any)?.inlineData?.data;
    const mimeType = (part as any)?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!audioData) {
      return res.status(500).json({
        error: 'Aucune donnée audio reçue de Gemini. Vérifiez que votre clé API est valide.',
        voiceUsed: actualVoiceId,
      });
    }

    return res.status(200).json({ base64Audio: audioData, mimeType });

  } catch (error: any) {
    console.error('[AfriVoice] Error:', error?.message || error);
    const statusCode = typeof error?.status === 'number' ? Math.min(error.status, 599) : 500;
    return res.status(statusCode).json({
      error: error?.message || 'Erreur inconnue lors de la génération audio.',
      errorType: error?.constructor?.name || 'UnknownError',
    });
  }
}
