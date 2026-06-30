export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid request body" } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { content, apiKey: clientKey } = body;

  // Prefer server-side env var so the key is never exposed in the browser
  const apiKey = process.env.ANTHROPIC_API_KEY || clientKey;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: "No API key configured" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: "user", content }],
    }),
  });

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
