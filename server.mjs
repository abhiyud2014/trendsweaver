import express from "express";
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || "";
delete process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });

const MODEL = "gemini-2.5-flash";

function extractJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return match ? match[1] || match[0] : text;
}

app.post("/api/discover", async (req, res) => {
  const { topic } = req.body;
  const currentDate = "March 2026";
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Act as Eye.ai. Scan real-world data sources for EMERGING signals and BREAKING patterns.
      
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
      }`,
      config: { tools: [{ googleSearch: {} }] },
    });
    const parsed = JSON.parse(extractJson(response.text || "{}"));
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/prioritize", async (req, res) => {
  const { signals } = req.body;
  const currentDate = "March 2026";
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Act as Map.ai. Evaluate and prioritize these signals using the Trend Prioritization Matrix as of ${currentDate}.
      Signals: ${JSON.stringify(signals)}
      
      Width: how broadly a trend covers multiple sectors (0-100).
      Depth: how deeply a trend reflects within dimensions (0-100).
      Quadrants: Buzz (High Width, Low Depth), Emergent (Low Width, Low Depth), Mainstream (High Width, High Depth), Niche (Low Width, High Depth).
      
      Return ONLY a valid JSON array (no markdown, no explanation):
      [{ "id": "s1", "score": 75, "width": 80, "depth": 40, "quadrant": "Buzz", "relevance": "..." }, ...]`,
      config: { tools: [{ googleSearch: {} }] },
    });
    const parsed = JSON.parse(extractJson(response.text || "[]"));
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/explain", async (req, res) => {
  const { trend, originalTopic } = req.body;
  const currentDate = "March 2026";
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Act as Describe. Explain this trend using an "outside-in" approach based on latest data from ${currentDate}.
      
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
      }`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const insight = JSON.parse(extractJson(response.text || "{}"));
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const verifiedUrl = groundingChunks?.find(c => c.web?.uri)?.web?.uri;
    insight.sourceUrl = verifiedUrl || insight.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(trend.title)}`;

    res.json(insight);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log("API server running on http://localhost:3001"));
