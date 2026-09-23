import Groq from 'groq-sdk';

const MODEL = 'qwen/qwen3.8-27b';

const extractionPrompt = `You are a source-code extraction system.

The supplied image contains source code displayed in a code editor or programming tutorial.

Extract ONLY the source code visible in the screenshot.

Requirements:
- Preserve line breaks.
- Preserve indentation.
- Preserve whitespace where meaningful.
- Preserve punctuation and symbols exactly.
- Preserve comments.
- Preserve strings exactly where readable.
- Preserve capitalization.
- Do not explain the code.
- Do not add explanations.
- Do not add Markdown code fences.
- Do not add \`\`\`javascript or \`\`\`js.
- Return ONLY the extracted source code.
- Do not invent code that is not visible.
- If something is genuinely unreadable, make the most conservative reconstruction possible.`;

export async function extractCodeFromImage(imageBuffer, mimeType) {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error('Vision service is not configured.');
    error.code = 'VISION_NOT_CONFIGURED';
    throw error;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  let response;

  try {
    const imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 2048,
      reasoning_effort: 'none',
      reasoning_format: 'hidden',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: extractionPrompt },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }]
    });
  } catch (error) {
    if ([401, 403].includes(error.status)) {
      const configurationError = new Error('The Groq API key is invalid or does not have access to the vision service.');
      configurationError.code = 'GROQ_AUTH_ERROR';
      throw configurationError;
    }

    if (error.status === 404) {
      const configurationError = new Error('The configured Groq vision model is unavailable.');
      configurationError.code = 'GROQ_VISION_MODEL_ERROR';
      throw configurationError;
    }

    if (error.status === 429) {
      const headers = error.headers ?? error.response?.headers;
      const getHeader = (name) => headers?.get?.(name) ?? headers?.[name] ?? headers?.[name.toLowerCase()] ?? null;

      console.warn('Groq rate limit metadata:', JSON.stringify({
        status: error.status,
        type: error.error?.type ?? error.type ?? 'unknown',
        message: error.error?.message ?? error.message ?? 'Unknown Groq error',
        retryAfter: getHeader('retry-after'),
        limitRequests: getHeader('x-ratelimit-limit-requests'),
        remainingRequests: getHeader('x-ratelimit-remaining-requests'),
        resetRequests: getHeader('x-ratelimit-reset-requests'),
        limitTokens: getHeader('x-ratelimit-limit-tokens'),
        remainingTokens: getHeader('x-ratelimit-remaining-tokens'),
        resetTokens: getHeader('x-ratelimit-reset-tokens'),
        model: MODEL
      }));

      const rateLimitError = new Error('Groq rate limit reached. Please try again shortly.');
      rateLimitError.code = 'GROQ_RATE_LIMIT_ERROR';
      throw rateLimitError;
    }

    if (error.status === 400) {
      const requestError = new Error('Groq rejected the image extraction request.');
      requestError.code = 'GROQ_REQUEST_ERROR';
      throw requestError;
    }

    throw error;
  }

  const code = response.choices?.[0]?.message?.content?.trim();

  if (!code) {
    throw new Error('The vision model returned no code.');
  }

  return code.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/\s*```$/, '');
}
