function parseFraction(text) {
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

export async function analyzeFood({ description, imageBase64, imageMimeType, apiKey, portionText }) {
  const content = [];

  if (imageBase64) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageMimeType || "image/jpeg",
        data: imageBase64,
      },
    });
  }

  const fraction = parseFraction(portionText);
  const pct = fraction !== null ? `${Math.round(fraction * 1000) / 10}%` : null;

  let basePrompt;
  if (description) {
    basePrompt = portionText
      ? fraction !== null
        ? `Estimate the nutrition for a WHOLE "${description}". Then multiply every value by ${fraction.toFixed(6)} because I ate ${portionText} (${pct}) of it. Return only the scaled values for my portion.`
        : `I ate ${portionText} of "${description}". Estimate nutrition for exactly this portion only, not the whole item.`
      : `I ate this: "${description}". Estimate the nutritional content for exactly the amount and portion described.`;
  } else {
    basePrompt = portionText
      ? fraction !== null
        ? `Estimate the nutrition for the WHOLE food in the image. Then multiply every value by ${fraction.toFixed(6)} because I ate ${portionText} (${pct}) of it. Return only the scaled values for my portion.`
        : `I ate ${portionText} of what is shown in the image. Estimate nutrition for exactly this portion only, not the whole item.`
      : "I ate what is shown in this image. Estimate the nutritional content for exactly the portion visible.";
  }

  content.push({
    type: "text",
    text: `${basePrompt}

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

  console.log("[API] Prompt:", basePrompt);
  console.log("[API] Calling proxy:", {
    hasImage: !!imageBase64,
    base64Chars: imageBase64?.length,
    hasDescription: !!description,
    portionText: portionText || "(none)",
  });

  let response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, apiKey }),
    });
  } catch (networkErr) {
    console.error("[API] fetch /api/analyze threw:", networkErr.name, networkErr.message);
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
