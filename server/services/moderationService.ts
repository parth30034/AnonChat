import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

export interface ModerationResult {
  action: 'allow' | 'warn' | 'block';
  score: number;
  reason?: string;
}

const BLOCK_THRESHOLD = 0.85;
const WARN_THRESHOLD  = 0.55;
const TIMEOUT_MS      = 2500;
const CACHE_TTL_MS    = 5 * 60 * 1000;
const CACHE_MAX       = 500;

const cache = new Map<string, { result: ModerationResult; ts: number }>();

function hashContent(s: string): string {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return h.toString(36);
}

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return _ai;
}

export async function classifyMessage(content: string): Promise<ModerationResult> {
  if (!config.geminiApiKey) return { action: 'allow', score: 0 };

  const key = hashContent(content.toLowerCase().trim());
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.result;

  try {
    const result = await Promise.race([
      _doClassify(content),
      new Promise<ModerationResult>((_, reject) =>
        setTimeout(() => reject(new Error('moderation timeout')), TIMEOUT_MS),
      ),
    ]);

    if (cache.size >= CACHE_MAX) {
      // Evict oldest entry
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      cache.delete(oldest[0]);
    }
    cache.set(key, { result, ts: Date.now() });
    return result;
  } catch {
    return { action: 'allow', score: 0 };
  }
}

async function _doClassify(content: string): Promise<ModerationResult> {
  const prompt = `You are a content moderation classifier. Analyze the following anonymous chat message for harmful content including: hate speech, harassment, threats, explicit sexual content, and spam.

Message: "${content.slice(0, 300).replace(/"/g, "'")}"

Rate the toxicity from 0.0 (completely safe) to 1.0 (extremely harmful).
Respond with JSON only, no other text: {"score": <number>, "reason": "<brief reason or null>"}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const text = response.text ?? '{}';
  let json: { score?: unknown; reason?: unknown } = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    json = JSON.parse(match?.[0] ?? '{}');
  } catch { /* fall through with defaults */ }

  const score = Math.max(0, Math.min(1, Number(json.score) || 0));
  const reason = typeof json.reason === 'string' && json.reason ? json.reason : undefined;

  let action: ModerationResult['action'];
  if (score >= BLOCK_THRESHOLD)     action = 'block';
  else if (score >= WARN_THRESHOLD) action = 'warn';
  else                              action = 'allow';

  return { action, score, reason };
}
