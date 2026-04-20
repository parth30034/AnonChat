import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const EMBEDDING_MODEL = 'text-embedding-004';
const CACHE_MAX       = 1000;

const cache = new Map<string, number[]>();

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return _ai;
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!config.geminiApiKey) return null;

  const key = text.slice(0, 150);
  if (cache.has(key)) return cache.get(key)!;

  try {
    const response = await getAI().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text.slice(0, 500),
    });

    const values: number[] | undefined = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) return null;

    if (cache.size >= CACHE_MAX) {
      cache.delete(cache.keys().next().value!);
    }
    cache.set(key, values);
    return values;
  } catch {
    return null;
  }
}
