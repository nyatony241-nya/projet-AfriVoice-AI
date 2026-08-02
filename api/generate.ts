import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { buildOptimizedPrompt } from '../services/voicePromptEngine';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default async function handler(req: any, res: any) {
  // Configurer les entêtes CORS pour autoriser l'accès depuis n'importe où
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Gérer la requête de pre-flight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Refuser tout ce qui n'est pas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  // Vérification stricte du token Supabase (Security Audit Fix)
  if (!supabase) {
    return res.status(500).json({ error: "Configuration serveur incomplète : Impossible de vérifier l'authentification (Clés Supabase manquantes)." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Token d'authentification manquant. Accès refusé." });
  }
  
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    return res.status(401).json({ error: "Token d'authentification invalide ou expiré. Accès refusé." });
  }

  try {
    const { script, voiceId, customApiKey, options } = req.body;

    if (!script || !voiceId) {
      return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
    }

    // La clé vient soit de l'utilisateur, soit des variables d'environnement Vercel
    const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
      ? customApiKey.trim() 
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "Aucune clé API Gemini configurée. Veuillez l'ajouter dans les variables d'environnement Vercel (GEMINI_API_KEY)." });
    }

    const ai = new GoogleGenAI({ apiKey });

    // ── AI Voice Director Engine ─────────────────────────────────
    // All prompt intelligence is now delegated to VoicePromptEngine.
    // The engine orchestrates: AIVoiceDirector → AccentIntelligence → HumanizerAI → SmartPromptOptimizer
    let contents = script;
    let actualVoiceId = voiceId;

    if (options) {
      const engineResult = buildOptimizedPrompt({
        script,
        voiceId,
        countryId: options.countryId || '',
        countryName: options.countryName || 'Africa',
        gender: options.gender || 'female',
        voiceVariant: options.voiceVariant,
        isClonedVoice: options.isClonedVoice,
        age: options.age || 30,
        emotion: options.emotion,
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        accentLevel: options.accentLevel,
        contentStyle: options.contentStyle,
        personality: options.personality,
        vocalObjective: options.vocalObjective,
        expertMode: options.expertMode,
        expertSettings: options.expertSettings,
        useLocalExpressions: options.useLocalExpressions,
      });

      contents = engineResult.prompt;
      actualVoiceId = engineResult.actualVoiceId;
    }

    // Appel à l'API Gemini pour la génération vocale
    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: contents,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: actualVoiceId,
              },
            },
          },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
        throw new Error("No audio data returned from Gemini");
    }

    return res.status(200).json({ base64Audio: audioData });
  } catch (error: any) {
    console.error("Vercel Serverless Error (Gemini):", error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).` 
    });
  }
}
