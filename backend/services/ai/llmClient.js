'use strict';

/**
 * OpenRouter LLM Client with Resilient Fallback Engine.
 * Supports OpenAI-compatible API endpoint format.
 */
const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 10000;

function parseStructuredJson(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch (_e) {}

  // 2. Try markdown fencing ```json ... ```
  const jsonFenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonFenced && jsonFenced[1]) {
    try {
      return JSON.parse(jsonFenced[1].trim());
    } catch (_e) {}
  }

  // 3. Try generic fencing ``` ... ```
  const genericFenced = trimmed.match(/```\s*([\s\S]*?)\s*```/i);
  if (genericFenced && genericFenced[1]) {
    try {
      return JSON.parse(genericFenced[1].trim());
    } catch (_e) {}
  }

  // 4. Try extracting outer brace structure { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch (_e) {}
  }

  return null;
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://medilink.app',
        'X-Title': 'MediLink HMS',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter request failed with status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '';
    const parsed = parseStructuredJson(contentText);

    if (!parsed) {
      throw new Error(`Malformed structured output from LLM model (${model})`);
    }

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * callLLM — Tries configured LLM provider (OpenRouter), falls back gracefully to rule-based mock.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Function} mockFn — async () => structuredObject
 * @returns {Promise<{ source: 'llm'|'mock', data: object }>}
 */
async function callLLM(systemPrompt, userPrompt, mockFn) {
  let fallbackReason = 'provider_not_configured';
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const data = await callOpenRouter(systemPrompt, userPrompt);
      return { source: 'llm', data: { ...data, _source: 'llm', _model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL } };
    } catch (err) {
      fallbackReason = err.name === 'AbortError' ? 'provider_timeout' : 'provider_error';
      console.warn(`[AI] OpenRouter invocation failed (${fallbackReason}); executing deterministic fallback.`);
    }
  }

  const mockData = await mockFn();
  return {
    source: 'rules',
    data: {
      ...mockData,
      _source: 'rules',
      _degraded: true,
      _fallbackReason: fallbackReason,
    },
  };
}

module.exports = { callLLM, parseStructuredJson };
