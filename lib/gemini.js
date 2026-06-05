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

/**
 * Fetch an image URL server-side and convert to a Gemini inlineData part.
 * Returns null if the image is too large or fetch fails.
 */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB hard cap

async function fetchImagePart(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    // Detect mime type from Content-Type header; fallback to image/jpeg
    const contentType = response.headers.get('content-type') || '';
    const mimeType = contentType.split(';')[0].trim() || 'image/jpeg';

    // Read body as ArrayBuffer to check size before base64 encoding
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null; // skip oversized images

    const data = Buffer.from(buffer).toString('base64');
    return { inlineData: { mimeType, data } };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gemini vision call: send text prompt + image inlineData parts, get JSON back.
 * @param {Object} opts
 * @param {string}   opts.systemPrompt
 * @param {string}   opts.textPrompt      - The text part of the user message
 * @param {string[]} opts.imageUrls       - Up to 5 image URLs (capped internally)
 * @param {string}   [opts.modelEnv]      - env var name for model override
 * @param {string}   [opts.defaultModel]  - default model id (without "models/" prefix)
 */
async function geminiGenerateJsonWithImages({ systemPrompt, textPrompt, imageUrls, modelEnv, defaultModel }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const model = (process.env[modelEnv] || defaultModel).replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Fetch all images concurrently; skip any that fail or are too large
  const capped = (imageUrls || []).slice(0, 5);
  const imageParts = (await Promise.all(capped.map((u) => fetchImagePart(u)))).filter(Boolean);

  const userParts = [
    ...imageParts,
    { text: textPrompt },
  ];

  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const err = new Error(`Gemini vision API error ${response.status}: ${detail.slice(0, 300)}`);
    err.code = 'GEMINI_API_ERROR';
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error('Gemini vision returned empty response');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  return {
    json: JSON.parse(text),
    model: `models/${model}`,
    ms: Date.now() - started,
    imagesUsed: imageParts.length,
  };
}

module.exports = { geminiGenerateJson, geminiGenerateJsonWithImages };
