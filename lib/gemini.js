// Gemini đôi khi trả JSON kèm chữ thừa / khối thứ hai (đo 07/10/2026: "non-whitespace after JSON at
// position 1981") → thử parse chặt, hỏng thì dùng parser chịu lỗi dùng chung với MiniMax.
function parseGeminiJson(text) {
  try { return JSON.parse(text); } catch { return require('./parse-json').parseJsonLoose(text); }
}

// Một lượt generateContent dùng chung cho chữ và ảnh: cùng khóa, cùng cách báo lỗi, cùng parser.
async function geminiRequest({ systemPrompt, parts, modelEnv, defaultModel, apiKey: keyOverride, timeoutMs }) {
  const apiKey = keyOverride || process.env.GEMINI_API_KEY;
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
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });

  if (!response.ok) {
    const detail = await response.text();
    const err = new Error(`Gemini API error ${response.status}: ${detail.slice(0, 300)}`);
    err.code = 'GEMINI_API_ERROR';
    err.status = response.status;
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
    json: parseGeminiJson(text),
    model: `models/${model}`,
    ms: Date.now() - started,
  };
}

async function geminiGenerateJson({ systemPrompt, userPrompt, modelEnv, defaultModel, apiKey }) {
  return geminiRequest({ systemPrompt, parts: [{ text: userPrompt }], modelEnv, defaultModel, apiKey });
}

/**
 * Gọi Gemini kèm ảnh (vision) — images: [{ mimeType, data: base64 }]. Ảnh đứng trước chữ hỏi.
 * Dùng cho lib/image-facts.js (phiếu hồ sơ đọc ảnh SKU/ảnh chính, 09/10/2026).
 */
async function geminiGenerateWithImages({ systemPrompt, userPrompt, images = [], modelEnv = 'GEMINI_VISION_MODEL', defaultModel = 'gemini-3.8-flash', apiKey, timeoutMs }) {
  const parts = [
    ...images.filter((i) => i && i.data).map((i) => ({ inline_data: { mime_type: i.mimeType || 'image/jpeg', data: i.data } })),
    { text: userPrompt },
  ];
  return geminiRequest({ systemPrompt, parts, modelEnv, defaultModel, apiKey, timeoutMs });
}

module.exports = { geminiGenerateJson, geminiGenerateWithImages, parseGeminiJson };
