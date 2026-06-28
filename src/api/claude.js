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
  "fat": <number in grams>,
  "fiber": <number in grams>,
  "sugar": <number in grams>,
  "sodium": <number in milligrams>,
  "saturated_fat": <number in grams>
}`,
  });

  console.log("[API] Calling proxy:", {
    hasImage: !!imageBase64,
    base64Chars: imageBase64?.length,
    hasDescription: !!description,
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
