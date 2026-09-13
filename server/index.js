import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Flash-class model with the generous free-tier quota (PRD §8). Google also
// publishes a "gemini-flash-latest" rolling alias, but in testing it routed to
// a preview model that returned 503 "high demand" errors — pin to the stable
// dated release instead, and bump via GEMINI_MODEL if a newer Flash ships.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const SYSTEM_PROMPT = `You are assisting a Legal Metrology field inspector in India who is reviewing a photograph of a packaged commodity label under the Legal Metrology (Packaged Commodities) Rules, 2011.

First assess image quality. If the label is too blurry, too dark, glare-heavy, badly cropped, or wrinkled enough that you cannot confidently read most of the text, respond with ONLY this JSON (no markdown fences, no prose):
{"image_quality":"retake_needed","retake_reason":"<one short specific sentence about what is wrong>","fields":[],"overall_status":null}

Otherwise, check the label for exactly these five mandatory declarations, in this order, and respond with ONLY this JSON shape:
{
  "image_quality": "good",
  "retake_reason": null,
  "fields": [
    {"name": "Manufacturer / Packer / Importer Name & Address", "value": "<what you read, or null>", "status": "compliant" | "non_compliant" | "missing", "explanation": "<one short sentence>"},
    {"name": "Net Quantity", "value": "...", "status": "...", "explanation": "..."},
    {"name": "Maximum Retail Price (incl. of all taxes)", "value": "...", "status": "...", "explanation": "..."},
    {"name": "Month & Year of Manufacture / Packing", "value": "...", "status": "...", "explanation": "..."},
    {"name": "Consumer Care Details", "value": "...", "status": "...", "explanation": "..."}
  ],
  "overall_status": "compliant" | "non_compliant"
}
Mark a field "missing" if it cannot be found at all, "non_compliant" if present but incomplete or incorrectly formatted (e.g. MRP without "inclusive of all taxes" wording, or a range instead of a fixed price), and "compliant" if present and properly stated. Keep each "explanation" under 15 words. If the label has text in more than one language, base your reading on the English text only. This is for a hackathon demo, not a legal ruling — make a confident, reasonable judgment call even where the rules are ambiguous. Respond with the JSON object only, nothing else.`;

app.post("/api/analyze", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it to .env and restart the backend." });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64 || !mediaType) {
    return res.status(400).json({ error: "Request must include base64 image data and mediaType." });
  }

  let geminiResponse;
  try {
    geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mediaType, data: base64 } },
              { text: "Analyze this packaged commodity label photo." },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
        },
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach the Gemini API: " + (e && e.message ? e.message : String(e)) });
  }

  let data;
  try {
    data = await geminiResponse.json();
  } catch (e) {
    return res.status(502).json({ error: "The Gemini API returned an unreadable response (HTTP " + geminiResponse.status + ")." });
  }

  if (!geminiResponse.ok) {
    const apiMsg = (data && data.error && data.error.message) || ("HTTP " + geminiResponse.status);
    return res.status(502).json({ error: "Gemini request failed: " + apiMsg });
  }

  const candidate = data.candidates && data.candidates[0];
  const textPart = candidate && candidate.content && candidate.content.parts && candidate.content.parts.find((p) => typeof p.text === "string");
  if (!textPart) {
    return res.status(502).json({ error: "The model didn't return any readable text in its response." });
  }

  const raw = textPart.text;
  const match = raw.match(/\{[\s\S]*\}/);
  const clean = match ? match[0] : raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    if (candidate.finishReason === "MAX_TOKENS") {
      return res.status(502).json({ error: "The response got cut off before it finished (this label had a lot to read). Try again." });
    }
    return res.status(502).json({ error: "Couldn't parse the model's response as JSON." });
  }

  if (parsed.image_quality !== "retake_needed" && !Array.isArray(parsed.fields)) {
    return res.status(502).json({ error: "The model's response was missing the expected fields list." });
  }

  return res.json(parsed);
});

app.listen(PORT, () => {
  console.log(`Legal Metrology backend listening on http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});
