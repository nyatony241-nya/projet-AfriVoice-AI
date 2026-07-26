import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY || API_KEY === "ta_cle_elevenlabs_ici") {
  console.error("❌ ERREUR: Tu dois ajouter ta vraie ELEVENLABS_API_KEY dans le fichier .env.local.");
  process.exit(1);
}

const client = new ElevenLabsClient({ apiKey: API_KEY });

async function run() {
  const audioFile = "./remotion/public/voice_elevenlabs.mp3";
  
  // Exemple: Voix de Bella (Femme, douce) assignée au Sénégal par exemple
  const voiceId = "EXAVITQu4vr4xnSDxMaL"; 
  
  // Exemple: Voix de Callum (Homme, grave)
  // const voiceId = "N2lVS1w4EtoT3dr4eOWO"; 
  
  const text = "Bienvenue sur AfriVoice. Le premier studio de voix-off IA de classe mondiale.";

  console.log(`Génération en cours avec ElevenLabs (Voix ID: ${voiceId})...`);

  try {
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });

    const fileStream = fs.createWriteStream(audioFile);
    audioStream.pipe(fileStream);

    fileStream.on('finish', () => {
      console.log(`✅ Succès ! L'audio a été sauvegardé dans : ${audioFile}`);
    });
  } catch (error) {
    console.error("❌ Erreur lors de la génération avec ElevenLabs:", error.message || error);
  }
}

run();
