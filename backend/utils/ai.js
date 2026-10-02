import { GoogleGenAI, Type } from "@google/genai";

/**
 * Generates vector embedding using Gemini embedding model.
 * Returns array of float numbers or null if failed.
 */
export const generateEmbedding = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text || !text.trim()) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text.trim(),
    });

    const values = response?.embeddings?.[0]?.values;
    return Array.isArray(values) && values.length > 0 ? values : null;
  } catch (err) {
    console.error("[AI] Embedding generation failed:", err.message);
    return null;
  }
};

/**
 * Calculates cosine similarity between two float vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for embeddings).
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Analyzes a support ticket using the official Google Gen AI SDK.
 * Leverages structured JSON schema for reliable, type-safe responses.
 * Optionally grounds skills against available team skills.
 * Returns null if AI service is not configured or an error occurs.
 */
export const analyzeTicket = async (ticket, availableSkills = []) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[AI] GEMINI_API_KEY not configured. Skipping automated AI analysis.");
    return null;
  }

  const skillsGrounding =
    Array.isArray(availableSkills) && availableSkills.length > 0
      ? `\nAvailable skills in our support team: [${availableSkills.join(", ")}]. Prefer matching from or prioritizing these available skills where relevant.`
      : "";

  const prompt = `You are an expert AI support triage assistant that processes technical support tickets.

Analyze the following support ticket and classify its priority, skills needed, and provide diagnostic troubleshooting steps.${skillsGrounding}

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A short 1-2 sentence summary of the issue.",
            },
            priority: {
              type: Type.STRING,
              description: 'One of "low", "medium", or "high".',
              enum: ["low", "medium", "high"],
            },
            helpfulNotes: {
              type: Type.STRING,
              description: "A detailed technical explanation or diagnostic advice for moderators.",
            },
            relatedSkills: {
              type: Type.ARRAY,
              description: "Array of relevant technical skills required to solve this ticket (e.g. React, MongoDB, PyTorch).",
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ["summary", "priority", "helpfulNotes", "relatedSkills"],
        },
        temperature: 0.2,
      },
    });

    const rawContent = response.text;
    if (!rawContent) {
      throw new Error("Empty response received from Gemini SDK");
    }

    const parsed = JSON.parse(rawContent);
    return {
      summary: parsed.summary || ticket.title,
      priority: ["low", "medium", "high"].includes(parsed.priority?.toLowerCase())
        ? parsed.priority.toLowerCase()
        : "medium",
      helpfulNotes: parsed.helpfulNotes || "",
      relatedSkills: Array.isArray(parsed.relatedSkills) ? parsed.relatedSkills : [],
    };
  } catch (err) {
    console.error("[AI] Gemini SDK call failed:", err.message);
    return null;
  }
};

export default analyzeTicket;