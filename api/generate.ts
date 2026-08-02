import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

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

    // Construction du prompt structuré pour piloter la voix (accent, genre, émotion, âge, débit, pitch)
    let contents = script;
    if (options) {
      const accentStr = options.accentDescription || 'French';
      const countryStr = options.countryName || 'France';
      const genderStr = options.gender === 'male' ? 'male' : 'female';
      const emotionStr = options.emotion || 'neutral';
      const styleStr = options.style || 'pro';
      const speedVal = options.speed || 1.0;
      const pitchVal = options.pitch || 1.0;
      const ageVal = options.age || 30;

      // 1. Définition détaillée de l'âge
      let ageInstruction = `mature adult ${genderStr} voice, around ${ageVal} years old, balanced and confident`;
      if (ageVal >= 55) {
        ageInstruction = `senior elderly ${genderStr} voice, around ${ageVal} years old, with a mature, wise, warm, and slightly raspy/weathered vocal quality`;
      } else if (ageVal <= 22) {
        ageInstruction = `extremely young and youthful ${genderStr} voice, around ${ageVal} years old, with a fresh, light-hearted, high-pitched, and energetic tone`;
      } else if (ageVal < 35) {
        ageInstruction = `young adult ${genderStr} voice, around ${ageVal} years old, modern, clear, and professional`;
      } else if (ageVal >= 35 && ageVal < 55) {
        ageInstruction = `mature adult ${genderStr} voice, around ${ageVal} years old, highly professional, warm, corporate, authoritative, and confident`;
      }

      // 2. Définition du débit de parole (Speed)
      let pacingInstruction = "Speak at a moderate, normal conversational speed.";
      if (speedVal < 1.0) {
        pacingInstruction = "Speak slowly and deliberately, with long pauses between sentences, taking your time.";
      } else if (speedVal > 1.0) {
        pacingInstruction = "Speak very fast and rapidly, with quick transitions and minimal pauses, filled with urgency.";
      }

      // 3. Définition du pitch (hauteur de voix)
      let pitchInstruction = "Use a standard, balanced pitch.";
      if (pitchVal < 1.0) {
        pitchInstruction = "Use a very deep, low-pitched, bassy, and resonant voice tone.";
      } else if (pitchVal > 1.0) {
        pitchInstruction = "Use a high-pitched, bright, sharp, and clear voice tone.";
      }

      // 4. Définition du style
      let styleInstruction = "professional narrator, clear and articulate";
      if (styleStr === 'casual') styleInstruction = "casual and conversational, friendly vibe";
      else if (styleStr === 'advertising') styleInstruction = "high-energy radio DJ or commercial advertisement style";
      else if (styleStr === 'narration') styleInstruction = "storytelling tone, expressive and descriptive";

      // 5. Définition de l'émotion
      let emotionInstruction = "neutral, clear narrator tone";
      if (emotionStr === 'happy') emotionInstruction = "happy, cheerful, warm, smiling and enthusiastic tone";
      else if (emotionStr === 'serious') emotionInstruction = "serious, professional news reporter or radio journalist tone, formal and objective";
      else if (emotionStr === 'energetic') emotionInstruction = "highly energetic, punchy, exciting, commercial advertisement or radio DJ promo trailer style";
      else if (emotionStr === 'soft') emotionInstruction = "soft, gentle, quiet, soothing, calm, and intimate storytelling tone";

      const localExprInstruction = options.useLocalExpressions 
        ? "* Local rhythm: Emphasize regional slang pronunciations and native speech patterns strongly."
        : "";

      contents = `Synthesize speech for the performance defined below. The profile, scene, and director's notes are for direction only. Do NOT speak them.

Profile: ${voiceId}
Director's Notes:
* CRITICAL ACCENT INSTRUCTION: You are a NATIVE speaker from ${countryStr}. You MUST speak with a heavy, authentic, and undeniable ${accentStr}. Do NOT under any circumstances use a standard Parisian French or standard American/British English accent. Your pronunciation, rhythm, melody, intonation, and phonetic placement MUST reflect a true local from ${countryStr}. Roll your Rs if applicable, use local phonetic inflections, and respect the unique musicality of this region's speech. This is absolutely mandatory for the role and the success of the recording.
* Vocal Actor: ${ageInstruction}
* Tone/Style: ${styleInstruction}
* Emotion: ${emotionInstruction}
* Pitch: ${pitchInstruction}
* Pacing: ${pacingInstruction}
${localExprInstruction ? `${localExprInstruction}\n` : ''}
#### TRANSCRIPT
${script}`;
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
                voiceName: voiceId,
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
