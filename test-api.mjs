import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const key = env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();

const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: "v1beta" } });

try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "What is the latest news about AI?",
    config: { tools: [{ googleSearch: {} }] },
  });
  console.log("SUCCESS:", response.text?.slice(0, 200));
} catch (e) {
  console.error("ERROR:", e.message);
}
