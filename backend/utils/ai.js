import { GoogleGenAI, Type } from "@google/genai";

/**
 * Analyzes a support ticket using the official Google Gen AI SDK.
 * Leverages structured JSON schema for reliable, type-safe responses.
 * Returns null if AI service is not configured or an error occurs.
 */
export const analyzeTicket = async (ticket) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[AI] GEMINI_API_KEY not configured. Skipping automated AI analysis.");
    return null;
  }

  const prompt = `You are an expert AI support triage assistant that processes technical support tickets.

Analyze the following support ticket and classify its priority, skills needed, and provide diagnostic troubleshooting steps.

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
              description: "Array of relevant technical skills required to solve this ticket (e.g. Selenium, React, MongoDB).",
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