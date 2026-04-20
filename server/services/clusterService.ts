import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { getEmbedding } from './embeddingService.js';

interface Cluster {
  id: string;
  label: string;
  centroid: number[];
  messageCount: number;
  sampleMessages: string[];
}

export interface ClusterAssignment {
  clusterId: string;
  clusterLabel: string;
  isNewCluster: boolean;
}

const SIMILARITY_THRESHOLD = 0.65;
const MAX_CLUSTERS         = 10;
const LABEL_AT_COUNT       = 3;

// In-memory cluster state per room — cleared when room goes inactive
const roomClusters = new Map<string, Cluster[]>();

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function updateCentroid(centroid: number[], vec: number[], count: number): number[] {
  return centroid.map((v, i) => (v * (count - 1) + vec[i]) / count);
}

function makeClusterId(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function assignToCluster(
  roomId: string,
  content: string,
): Promise<ClusterAssignment | null> {
  const embedding = await getEmbedding(content);
  if (!embedding) return null;

  if (!roomClusters.has(roomId)) roomClusters.set(roomId, []);
  const clusters = roomClusters.get(roomId)!;

  let best: Cluster | null = null;
  let bestSim = -1;
  for (const cluster of clusters) {
    const sim = cosineSimilarity(embedding, cluster.centroid);
    if (sim > bestSim) { bestSim = sim; best = cluster; }
  }

  let isNewCluster = false;

  if (!best || bestSim < SIMILARITY_THRESHOLD) {
    if (clusters.length >= MAX_CLUSTERS) {
      // Merge into least-active cluster rather than creating a new one
      best = clusters.reduce((a, b) => (a.messageCount <= b.messageCount ? a : b));
    } else {
      best = {
        id: makeClusterId(),
        label: 'New Topic',
        centroid: embedding,
        messageCount: 0,
        sampleMessages: [],
      };
      clusters.push(best);
      isNewCluster = true;
    }
  }

  best.messageCount++;
  best.centroid = updateCentroid(best.centroid, embedding, best.messageCount);
  if (best.sampleMessages.length < 5) best.sampleMessages.push(content.slice(0, 120));

  // Generate a meaningful label when threshold reached
  if (best.messageCount === LABEL_AT_COUNT || isNewCluster) {
    generateLabel(roomId, best.id).catch(() => {});
  }

  return { clusterId: best.id, clusterLabel: best.label, isNewCluster };
}

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return _ai;
}

export async function generateLabel(roomId: string, clusterId: string): Promise<string | null> {
  if (!config.geminiApiKey) return null;
  const cluster = roomClusters.get(roomId)?.find(c => c.id === clusterId);
  if (!cluster || cluster.sampleMessages.length === 0) return null;

  try {
    const samples = cluster.sampleMessages.slice(0, 3).map(m => `- "${m}"`).join('\n');
    const prompt = `Given these anonymous chat messages, reply with a concise 2–3 word topic label (no quotes, no punctuation).
${samples}
Respond with JSON only: {"label": "<2-3 words>"}`;

    const response = await getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text ?? '{}';
    let json: { label?: unknown } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      json = JSON.parse(match?.[0] ?? '{}');
    } catch { /* ignore */ }

    const label = String(json.label ?? '').trim().slice(0, 32);
    if (label) cluster.label = label;
    return label || null;
  } catch {
    return null;
  }
}

export function getClusterLabel(roomId: string, clusterId: string): string {
  return roomClusters.get(roomId)?.find(c => c.id === clusterId)?.label ?? 'Topic';
}

export function clearRoomClusters(roomId: string): void {
  roomClusters.delete(roomId);
}

export function getRoomTopics(roomId: string): Array<{ id: string; label: string; messageCount: number }> {
  return (roomClusters.get(roomId) ?? [])
    .sort((a, b) => b.messageCount - a.messageCount)
    .map(({ id, label, messageCount }) => ({ id, label, messageCount }));
}
