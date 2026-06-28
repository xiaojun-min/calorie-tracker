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

  const body = JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content }],
  });

  console.log("[API] About to fetch:", {
    hasImage: !!imageBase64,
    imageMimeType,
    base64Chars: imageBase64?.length,
    bodyBytes: body.length,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 10) + "..." : "(empty)",
  });

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body,
    });
  } catch (networkErr) {
    console.error("[API] fetch() threw — network/CORS error:", {
      name: networkErr.name,
      message: networkErr.message,
      stack: networkErr.stack,
    });
    throw new Error(`Network error (${networkErr.name}: ${networkErr.message}). Check internet connection and that Safari is not blocking cross-site requests.`);
  }

  console.log("[API] Response received:", { status: response.status, ok: response.ok });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error("[API] Non-OK response:", { status: response.status, body: errBody });
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
    console.error("[API] JSON.parse failed:", parseErr.message, jsonMatch[0]);
    throw new Error(`Invalid JSON in response: ${parseErr.message}`);
  }
}
