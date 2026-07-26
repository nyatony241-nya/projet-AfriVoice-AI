import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

if (!SPEECH_KEY || !SPEECH_REGION || SPEECH_KEY === "ton_azure_speech_key_ici") {
  console.error("❌ ERREUR: Tu dois ajouter AZURE_SPEECH_KEY et AZURE_SPEECH_REGION dans le fichier .env.local.");
  process.exit(1);
}

async function run() {
  const audioFile = "./remotion/public/voice_azure.mp3";
  
  // Exemple: Accent de Côte d'Ivoire (Femme)
  const voiceName = "fr-CI-AissaNeural"; 
  
  // Exemple: Accent du Sénégal (Homme)
  // const voiceName = "fr-SN-OumarNeural"; 
  
  const text = "Bienvenue sur AfriVoice. Le premier studio de voix-off IA avec de véritables accents africains locaux.";

  console.log(`Génération en cours avec la voix Azure : ${voiceName}...`);

  const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
  
  // Configuration pour obtenir un MP3 de haute qualité
  speechConfig.setSpeechSynthesisOutputFormat(sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3);
  speechConfig.speechSynthesisVoiceName = voiceName;

  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  synthesizer.speakTextAsync(
    text,
    (result) => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        console.log(`✅ Succès ! L'audio a été sauvegardé dans : ${audioFile}`);
      } else {
        console.error("Erreur de synthèse:", result.errorDetails);
      }
      synthesizer.close();
    },
    (error) => {
      console.error("Erreur Azure:", error);
      synthesizer.close();
    }
  );
}

run();
