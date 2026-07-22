import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const prompt = `Génère une voix-off. Accent: Ivoirien (naturel). Genre: Femme. Ton informatif et dynamique. Script: "Bienvenue sur AfriVoice. L'I A de voix-off ultime adaptée au marché Africain."`;
  
  try {
    console.log("Generating audio...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" }, // Or whatever voice is standard
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const buffer = Buffer.from(base64Audio, 'base64');
      fs.writeFileSync('./remotion/public/voice.mp3', buffer);
      console.log("Audio generated successfully at remotion/public/voice.mp3");
    } else {
      console.log("No audio received from API.");
    }
  } catch (error) {
    console.error("Error generating audio:", error);
  }
}

run();
