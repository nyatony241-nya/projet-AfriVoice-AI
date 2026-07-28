export interface GeminiAudioResult {
  /** Blob WAV pour téléchargement/stockage */
  blob: Blob;
  /** Samples PCM Float32 prêts pour AudioContext */
  float32Samples: Float32Array;
  /** Sample rate (généralement 24000 Hz pour Gemini TTS) */
  sampleRate: number;
}

/**
 * Décode le base64 PCM L16 (Int16) en Float32 pour AudioContext.
 * Gemini TTS retourne du PCM 16-bit signé, mono, 24kHz.
 */
function decodePcmL16ToFloat32(base64Pcm: string): { samples: Float32Array; sampleRate: number } {
  const binaryString = atob(base64Pcm);
  const pcmBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i);
  }

  // PCM L16 = Int16, little-endian
  const int16View = new Int16Array(pcmBytes.buffer);
  const float32 = new Float32Array(int16View.length);
  for (let i = 0; i < int16View.length; i++) {
    float32[i] = int16View[i] / 32768.0; // Normalise [-1, 1]
  }

  return { samples: float32, sampleRate: 24000 };
}

/**
 * Construit un Blob WAV à partir de Float32 pour le téléchargement.
 */
function float32ToWavBlob(float32: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = float32.length * 2; // 2 bytes per sample (Int16)
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);         // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Convertit Float32 → Int16 dans le buffer WAV
  const output = new Int16Array(buffer, 44);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const generateVoiceOver = async (
  script: string,
  voiceId: string
): Promise<GeminiAudioResult> => {
  let customApiKey = '';

  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('AFRIVOICE_API_KEY') || localStorage.getItem('GEMINI_API_KEY');
    if (localKey && localKey.trim() !== '' && localKey !== 'PLACEHOLDER_API_KEY') {
      customApiKey = localKey.trim();
    }
  }

  const isDev = import.meta.env.DEV;
  const backendUrl = isDev ? 'http://localhost:3001/api/generate' : '/api/generate';

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, voiceId, customApiKey }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de la communication avec le serveur vocal sécurisé.');
  }

  if (!data.base64Audio) {
    throw new Error('Aucune donnée audio reçue du serveur.');
  }

  const mimeType: string = data.mimeType || 'audio/l16; rate=24000';

  // Gemini TTS → PCM L16 brut → Float32 → AudioBuffer (sans decodeAudioData)
  if (mimeType.includes('l16') || mimeType.includes('L16') || mimeType.includes('pcm') || mimeType.includes('raw')) {
    const { samples, sampleRate } = decodePcmL16ToFloat32(data.base64Audio);
    const blob = float32ToWavBlob(samples, sampleRate);
    return { blob, float32Samples: samples, sampleRate };
  }

  // Fallback pour formats déjà encodés (mp3, ogg, wav standard)
  const base64Response = await fetch(`data:${mimeType};base64,${data.base64Audio}`);
  const blob = await base64Response.blob();
  return { blob, float32Samples: new Float32Array(0), sampleRate: 24000 };
};
