import { GoogleGenAI } from "@google/genai";

export interface Signal {
  id: string;
  title: string;
  source: string;
  description: string;
  category: string;
}

export interface PrioritizedTrend extends Signal {
  score: number;
  width: number;
  depth: number;
  quadrant: "Buzz" | "Emergent" | "Mainstream" | "Niche";
  relevance: string;
}

export interface TrendInsight extends PrioritizedTrend {
  narrative: string;
  categoryContext: string;
  macroContext: string;
  keyInsight: string;
  implication: string;
  examples: string[];
  sourceUrl?: string;
  sourceCitation?: string;
  relatedSignals: string[];
  scoreBreakdown: {
    ubiquity: number;
    impact: number;
    relevance: number;
  };
}

export interface DiscoveryResult {
  summary: string;
  signals: Signal[];
}

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1beta" },
});

const MODEL = "gemini-2.5-flash";
const currentDate = "March 2026";

function extractJson(text: string) {
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return match ? match[1] || match[0] : text;
}

async function generate(contents: string) {
  return ai.models.generateContent({
    model: MODEL,
    contents,
    config: { tools: [{ googleSearch: {} }] },
  });
}

export const trendService = {
  async discoverSignals(topic: string): Promise<DiscoveryResult> {
    const response = await generate(
      `Act as Eye.ai. Scan real-world data sources for EMERGING signals and BREAKING patterns.
      
      UNIFIED CONTEXT: "${topic}" — treat as a single unified context.
      
      METHODOLOGY (3R): RELIABLE sources, RECENT (last 6 months), RECURRING patterns.
      DIMENSIONS: MACRO (Economic, Tech, Politics, Legal, Environment), CULTURE, PERSONAL.
      CRITICAL: Focus ONLY on signals from late 2025 to ${currentDate}.
      
      Return ONLY a valid JSON object (no markdown, no explanation):
      {
        "summary": "2-sentence landscape summary as of ${currentDate}",
        "signals": [
          { "id": "s1", "title": "...", "source": "...", "description": "...", "category": "..." },
          ... 5 signals total
        ]
      }`
    );
    return JSON.parse(extractJson(response.text || "{}"));
  },

  async prioritizeTrends(signals: Signal[]): Promise<PrioritizedTrend[]> {
    const response = await generate(
      `Act as Map.ai. Evaluate and prioritize these signals using the Trend Prioritization Matrix as of ${currentDate}.
      Signals: ${JSON.stringify(signals)}
      
      Width: how broadly a trend covers multiple sectors (0-100).
      Depth: how deeply a trend reflects within dimensions (0-100).
      Quadrants: Buzz (High Width, Low Depth), Emergent (Low Width, Low Depth), Mainstream (High Width, High Depth), Niche (Low Width, High Depth).
      
      Return ONLY a valid JSON array (no markdown, no explanation):
      [{ "id": "s1", "score": 75, "width": 80, "depth": 40, "quadrant": "Buzz", "relevance": "..." }, ...]`
    );
    const priorities = JSON.parse(extractJson(response.text || "[]"));
    return signals.map(s => ({ ...s, ...priorities.find((p: any) => p.id === s.id) }));
  },

  async explainTrend(trend: PrioritizedTrend, originalTopic: string): Promise<TrendInsight> {
    const response = await generate(
      `Act as Describe. Explain this trend using an "outside-in" approach based on latest data from ${currentDate}.
      
      ORIGINAL SEARCH CONTEXT: "${originalTopic}"
      TREND: ${trend.title} — ${trend.description}
      Quadrant: ${trend.quadrant}
      
      Use Google Search to find a REAL, CURRENT (late 2025 or 2026) source. DO NOT hallucinate URLs.
      
      Return ONLY a valid JSON object (no markdown, no explanation):
      {
        "narrative": "compelling narrative on 2026 trajectory",
        "categoryContext": "specific category context",
        "macroContext": "broader macro context",
        "keyInsight": "one-sentence powerful takeaway",
        "implication": "what this means for brands/businesses",
        "examples": ["example 1", "example 2", "example 3"],
        "sourceUrl": "real URL from search results",
        "sourceCitation": "formal citation",
        "relatedSignals": ["signal 1", "signal 2", "signal 3"],
        "scoreBreakdown": { "ubiquity": 70, "impact": 80, "relevance": 75 }
      }`
    );
    const insight = JSON.parse(extractJson(response.text || "{}"));
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const verifiedUrl = groundingChunks?.find((c: any) => c.web?.uri)?.web?.uri;
    insight.sourceUrl = verifiedUrl || insight.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(trend.title)}`;
    return { ...trend, ...insight };
  },
};
