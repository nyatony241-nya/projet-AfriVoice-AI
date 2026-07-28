/**
 * Convertit du PCM brut L16 (format Gemini TTS) en WAV lisible par le navigateur.
 * Gemini TTS retourne de l'audio PCM 16-bit, mono, 24kHz.
 */
function pcmToWav(base64Pcm: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Blob {
  const binaryString = atob(base64Pcm);
  const pcmBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i);
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);        // Chunk size
  view.setUint16(20, 1, true);         // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Copier les données PCM
  new Uint8Array(buffer).set(pcmBytes, 44);

  return new Blob([buffer], { type: 'audio/wav' });
}

export const generateVoiceOver = async (
  script: string, 
  voiceId: string
): Promise<Blob> => {
  let customApiKey = '';
  
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('AFRIVOICE_API_KEY') || localStorage.getItem('GEMINI_API_KEY');
    if (localKey && localKey.trim() !== '' && localKey !== 'PLACEHOLDER_API_KEY') {
      customApiKey = localKey.trim();
    }
  }

  // En local → Express (3001), sur Vercel → Serverless Function
  const isDev = import.meta.env.DEV;
  const backendUrl = isDev ? 'http://localhost:3001/api/generate' : '/api/generate';

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, voiceId, customApiKey })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erreur lors de la communication avec le serveur vocal sécurisé.");
  }

  if (!data.base64Audio) {
    throw new Error("Aucune donnée audio reçue du serveur.");
  }

  const mimeType: string = data.mimeType || 'audio/L16;rate=24000';

  // Gemini TTS retourne du PCM L16 brut → on construit le header WAV manuellement
  if (mimeType.includes('L16') || mimeType.includes('pcm') || mimeType.includes('audio/raw')) {
    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
    return pcmToWav(data.base64Audio, sampleRate);
  }

  // Fallback : format standard (mp3, ogg, wav déjà encodé)
  const base64Response = await fetch(`data:${mimeType};base64,${data.base64Audio}`);
  return await base64Response.blob();
};
