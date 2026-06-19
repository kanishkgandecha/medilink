'use strict';

// OpenRouter uses OpenAI-compatible /chat/completions format.
// Set OPENROUTER_API_KEY in .env to enable real LLM calls.
// Falls back to rich rule-based mock responses when key is absent.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-opus-4';   // swap to any OpenRouter model as needed

async function callOpenRouter(systemPrompt, userPrompt) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://medilink.app',
      'X-Title': 'MediLink HMS',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();

  // Strip optional ```json ... ``` fencing
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw);
}

/**
 * callLLM — tries OpenRouter first, falls back to mockFn().
 * @param {string}   systemPrompt
 * @param {string}   userPrompt
 * @param {Function} mockFn  — async () => structuredObject
 * @returns {{ source: 'llm'|'mock', data: object }}
 */
async function callLLM(systemPrompt, userPrompt, mockFn) {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const data = await callOpenRouter(systemPrompt, userPrompt);
      return { source: 'llm', data };
    } catch (err) {
      console.warn('[AI] OpenRouter failed — using mock:', err.message);
    }
  }
  const data = await mockFn();
  return { source: 'mock', data };
}

module.exports = { callLLM };
