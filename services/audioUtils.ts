
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Fetch and decode an audio file from a URL.
 */
export async function fetchAndDecodeAudio(url: string, ctx: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

/**
 * Décode les données PCM brutes (16-bit) en un AudioBuffer.
 */
export async function decodeRawPcm(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Utilisation de l'offset et de la longueur pour éviter les erreurs d'alignement du buffer
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Mixe deux AudioBuffers ensemble avec des volumes différents.
 */
export function mixAudioBuffers(
  voiceBuffer: AudioBuffer,
  bgMusicBuffer: AudioBuffer | null,
  voiceVol: number, // 0-150
  bgVol: number,    // 0-100
  ctx: AudioContext
): AudioBuffer {
  const voiceGain = voiceVol / 100;
  const bgGain = bgVol / 100;

  const frameCount = voiceBuffer.length;
  const sampleRate = voiceBuffer.sampleRate;
  const channels = voiceBuffer.numberOfChannels;

  const mixedBuffer = ctx.createBuffer(channels, frameCount, sampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const mixedData = mixedBuffer.getChannelData(channel);
    const voiceData = voiceBuffer.getChannelData(channel);
    const bgData = bgMusicBuffer ? bgMusicBuffer.getChannelData(channel % bgMusicBuffer.numberOfChannels) : null;

    for (let i = 0; i < frameCount; i++) {
      let sample = voiceData[i] * voiceGain;
      if (bgData) {
        // Boucle la musique si elle est plus courte que la voix
        const bgIndex = i % bgData.length;
        sample += bgData[bgIndex] * bgGain;
      }
      // Limitation pour éviter la distorsion numérique (hard clipping)
      mixedData[i] = Math.max(-1, Math.min(1, sample));
    }
  }

  return mixedBuffer;
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}
