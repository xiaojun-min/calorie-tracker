export async function analyzeFood({ description, imageBase64, imageMimeType, apiKey }) {
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

  const textPrompt = description
    ? `Analyze this food: "${description}". Estimate the nutritional content.`
    : "Analyze this food in the image. Estimate the nutritional content.";

  content.push({
    type: "text",
    text: `${textPrompt}

Reply ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "name": "food name (short, max 40 chars)",
  "emoji": "single relevant food emoji",
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>
}`,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse response");

  return JSON.parse(jsonMatch[0]);
}
