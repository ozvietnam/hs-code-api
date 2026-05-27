async function geminiGenerateJson({ systemPrompt, userPrompt, modelEnv, defaultModel }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const model = (process.env[modelEnv] || defaultModel).replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const err = new Error(`Gemini API error ${response.status}: ${detail.slice(0, 300)}`);
    err.code = 'GEMINI_API_ERROR';
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error('Gemini returned empty response');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  return {
    json: JSON.parse(text),
    model: `models/${model}`,
    ms: Date.now() - started,
  };
}

module.exports = { geminiGenerateJson };
