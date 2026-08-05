import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const VOICE_MAP: Record<string, string> = {
  "female-voice1": "Aoede",
  "female-voice2": "Kore",
  "female-voice3": "Leda",
  "male-voice1": "Puck",
  "male-voice2": "Charon",
  "male-voice3": "Fenrir",
};

const CONTENT_SCENES: Record<string, string> = {
  advertisement: "You are recording a premium TV/radio advertisement. Punchy, persuasive, magnetic delivery.",
  tiktok: "You are filming a viral short video. Ultra-energetic, authentic, speaking directly to your best friend.",
  podcast: "You are hosting a popular podcast. Conversational, intimate, thoughtful.",
  news: "You are a trusted primetime news anchor. Serious, authoritative, measured. Zero smiling.",
  storytelling: "You are a master storyteller. Build tension slowly, use dramatic pauses.",
  documentary: "You are narrating a cinematic documentary. Calm, contemplative, wise.",
  motivation: "You are on stage at a massive conference. Your voice builds like a wave.",
  youtube: "You are a popular YouTuber. Energetic but genuine, natural enthusiasm.",
  radio: "You are a beloved radio host. Smooth, flowing, warm delivery.",
  training: "You are leading an online training course. Patient, clear, pedagogical.",
  commercial: "You are presenting a business solution. Confident, credible, polished.",
  narration: "You are recording a professional voiceover. Versatile, clear, expressive.",
};

function buildDirectorPrompt(params: {
  voiceVariant?: string;
  countryName: string;
  gender: string;
  age: number;
  emotion?: string;
  contentStyle?: string;
  personality?: string;
}): { systemInstruction: string; actualVoiceId: string } {
  const { countryName, gender, age, emotion, contentStyle, personality, voiceVariant } = params;
  const voiceKey = gender.toLowerCase() + "-" + (voiceVariant || "voice1");
  const actualVoiceId = VOICE_MAP[voiceKey] || (gender.toLowerCase() === "female" ? "Aoede" : "Puck");
  const genderWord = gender.toLowerCase() === "female" ? "woman" : "man";
  const scene = CONTENT_SCENES[contentStyle || "narration"] || CONTENT_SCENES.narration;

  const emotionMap: Record<string, string> = {
    happy: "Your mood is genuinely happy - smile while speaking, warmth colors every phrase.",
    serious: "Your mood is serious - no smiling, deliberate pacing, gravitas in every word.",
    energetic: "Your mood is electric - speak with urgency and excitement.",
    soft: "Your mood is gentle - speak softly, like comforting someone you care about.",
  };
  const emotionDesc = emotion && emotion !== "neutral" ? (emotionMap[emotion.toLowerCase()] || "") : "";

  const personalityMap: Record<string, string> = {
    entrepreneur: "You have the energy of a startup founder - assertive, visionary.",
    professor: "You have the calm authority of a beloved professor - articulate, patient.",
    journalist: "You have the precision of an award-winning journalist - objective, crisp.",
    ceo: "You have the commanding presence of a CEO - visionary, authoritative.",
    coach: "You have the empowering fire of a life coach - passionate.",
    radio_host: "You have the smooth charm of a beloved radio host.",
    influencer: "You have the magnetic charisma of a social media star.",
  };
  const personalityDesc = personality ? (personalityMap[personality] || "") : "";

  const lines = [
    "[CHARACTER]",
    "You are a " + age + "-year-old " + genderWord + " from " + countryName + ". A native speaker who grew up there - warm, authentic, and expressive.",
    personalityDesc,
    "",
    "[SCENE]",
    scene,
    "",
    emotionDesc,
    "",
    "[RULES]",
    "1. Speak ONLY the exact text provided. Do not add or change anything.",
    "2. Do NOT read any bracketed labels or instructions.",
    "3. Sound like a real native person from " + countryName + " - never generic or robotic.",
  ].filter((l): l is string => Boolean(l));

  return { systemInstruction: lines.join("
"), actualVoiceId };
}

const aiClientCache = new Map<string, GoogleGenAI>();
function getAiClient(apiKey: string): GoogleGenAI {
  if (!aiClientCache.has(apiKey)) aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
  return aiClientCache.get(apiKey)!;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Methode non autorisee. Utilisez POST." });

  try {
    const body = req.body || {};
    const { script, customApiKey, options } = body;

    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ error: "Le parametre script est requis." });
    }

    const apiKey = (customApiKey && customApiKey.trim() !== "" && customApiKey !== "PLACEHOLDER_API_KEY")
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Cle API Gemini manquante. Dans Vercel: Settings -> Environment Variables -> Ajoutez GEMINI_API_KEY.",
        diagnostic: {
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "present" : "MISSING",
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? "present" : "MISSING",
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? "present" : "MISSING",
        }
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data.user) {
            return res.status(401).json({ error: "Token invalide ou expire. Reconnectez-vous." });
          }
        }
      } catch (authError: any) {
        console.warn("[AfriVoice] Supabase auth failed (non-blocking):", authError?.message);
      }
    }

    const { systemInstruction, actualVoiceId } = buildDirectorPrompt({
      voiceVariant: options?.voiceVariant,
      countryName: options?.countryName || "Africa",
      gender: options?.gender || "female",
      age: options?.age || 30,
      emotion: options?.emotion,
      contentStyle: options?.contentStyle,
      personality: options?.personality,
    });

    const ai = getAiClient(apiKey);

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text: script.trim() }] }],
      config: {
        systemInstruction,
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: actualVoiceId },
          },
        },
      },
    });

    const part = geminiResponse.candidates?.[0]?.content?.parts?.[0];
    const audioData = (part as any)?.inlineData?.data;
    const mimeType = (part as any)?.inlineData?.mimeType || "audio/L16;rate=24000";

    if (!audioData) {
      return res.status(500).json({
        error: "Aucune donnee audio recue de Gemini. Verifiez que votre cle API est valide.",
        voiceUsed: actualVoiceId,
      });
    }

    return res.status(200).json({ base64Audio: audioData, mimeType });

  } catch (error: any) {
    console.error("[AfriVoice] Error:", error?.message || error);
    const statusCode = typeof error?.status === "number" ? Math.min(error.status, 599) : 500;
    return res.status(statusCode).json({
      error: error?.message || "Erreur inconnue lors de la generation audio.",
      errorType: error?.constructor?.name || "UnknownError",
    });
  }
}
