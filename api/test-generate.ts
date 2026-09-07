export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(401).json({ error: "Aucune clé GEMINI_API_KEY dans Vercel." });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Bonjour ceci est un test Vercel." }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Aoede" }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const inlineAudio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (inlineAudio) {
      return res.status(200).json({ base64Audio: inlineAudio, success: true });
    }

    return res.status(500).json({ error: "Audio vide", data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
