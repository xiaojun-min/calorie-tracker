export async function scanLabel({ imageBase64, imageMimeType, apiKey }) {
  const content = [
    {
      type: "image",
      source: { type: "base64", media_type: imageMimeType || "image/jpeg", data: imageBase64 },
    },
    {
      type: "text",
      text: `This is a nutrition facts label from a food package. Read it carefully and return ONLY this JSON (no markdown):
{
  "name": "product name (short, max 40 chars)",
  "emoji": "single relevant food emoji",
  "serving_size": "serving size as printed on label (e.g. '1 cup (240ml)' or '1 bar (40g)')",
  "calories": <calories per serving, number>,
  "protein": <grams per serving, number>,
  "carbs": <total carbohydrate grams per serving, number>,
  "fat": <total fat grams per serving, number>,
  "fiber": <dietary fiber grams per serving, number or 0>,
  "sugar": <total sugar grams per serving, number or 0>,
  "sodium": <sodium milligrams per serving, number or 0>,
  "saturated_fat": <saturated fat grams per serving, number or 0>,
  "health_rating": <integer 1-10 where 10 is most healthy>
}`,
    },
  ];

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, apiKey }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${err?.error?.message || response.statusText}`);
  }
  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not read the nutrition label. Try a clearer photo.");
  return JSON.parse(match[0]);
}

export function parseFraction(text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  const slashMatch = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) return parseInt(slashMatch[1]) / parseInt(slashMatch[2]);
  const decimalMatch = t.match(/^(\d+\.?\d*)$/);
  if (decimalMatch) return parseFloat(decimalMatch[0]);
  const words = {
    "half": 0.5, "a half": 0.5, "one half": 0.5,
    "quarter": 0.25, "a quarter": 0.25, "one quarter": 0.25, "one fourth": 0.25,
    "third": 1/3, "a third": 1/3, "one third": 1/3,
    "eighth": 0.125, "one eighth": 0.125,
    "two thirds": 2/3, "three quarters": 0.75, "three fourths": 0.75,
  };
  return words[t] ?? null;
}

const NUTRITION_KEYS = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "saturated_fat"];

export function scaleResult(result, fraction, portionText) {
  const scaled = { ...result };
  for (const key of NUTRITION_KEYS) {
    scaled[key] = Math.round((result[key] || 0) * fraction);
  }
  // Append portion to name so it's clear in the log
  scaled.name = `${result.name} (${portionText})`.slice(0, 40);
  return scaled;
}

async function callApi({ content, apiKey }) {
  console.log("[API] Calling proxy");
  let response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, apiKey }),
    });
  } catch (networkErr) {
    console.error("[API] fetch threw:", networkErr.name, networkErr.message);
    throw new Error(`Network error: ${networkErr.message}`);
  }

  console.log("[API] Proxy response:", response.status);

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error("[API] Error body:", errBody);
    throw new Error(`API error ${response.status}: ${errBody?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  console.log("[API] Response text:", text);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[API] No JSON in response:", text);
    throw new Error(`Could not parse response: "${text.slice(0, 120)}"`);
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    console.error("[API] JSON.parse failed:", parseErr.message);
    throw new Error(`Invalid JSON in response: ${parseErr.message}`);
  }
}

function buildContent({ description, imageBase64, imageMimeType, prompt }) {
  const content = [];
  if (imageBase64) {
    content.push({ type: "image", source: { type: "base64", media_type: imageMimeType || "image/jpeg", data: imageBase64 } });
  }
  content.push({
    type: "text",
    text: `${prompt}

Reply ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "name": "food name (short, max 40 chars)",
  "emoji": "single relevant food emoji",
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "fiber": <number in grams>,
  "sugar": <number in grams>,
  "sodium": <number in milligrams>,
  "saturated_fat": <number in grams>,
  "health_rating": <integer 1-10 where 10 is most healthy>
}`,
  });
  return content;
}

export async function analyzeFood({ description, imageBase64, imageMimeType, apiKey, portionText }) {
  const fraction = parseFraction(portionText);

  // When portionText is a parseable fraction, get the whole-item nutrition first
  // then scale in JS — guarantees 1/8 and 0.125 always produce identical results.
  if (fraction !== null) {
    const wholePrompt = description
      ? `Estimate the nutrition for a WHOLE "${description}" (the entire thing, not a portion).`
      : "Estimate the nutrition for the WHOLE food shown in this image (the entire thing, not a portion).";
    console.log("[API] Prompt (whole item):", wholePrompt);
    const wholeResult = await callApi({ content: buildContent({ description, imageBase64, imageMimeType, prompt: wholePrompt }), apiKey });
    return scaleResult(wholeResult, fraction, portionText);
  }

  // Non-numeric portion (e.g. "a large handful") — ask Claude to estimate directly
  const prompt = portionText
    ? description
      ? `I ate ${portionText} of "${description}". Estimate nutrition for exactly this portion.`
      : `I ate ${portionText} of what is shown in the image. Estimate nutrition for exactly this portion.`
    : description
      ? `I ate this: "${description}". Estimate the nutritional content for exactly the amount described.`
      : "I ate what is shown in this image. Estimate the nutritional content for the portion visible.";

  console.log("[API] Prompt:", prompt);
  return callApi({ content: buildContent({ description, imageBase64, imageMimeType, prompt }), apiKey });
}
