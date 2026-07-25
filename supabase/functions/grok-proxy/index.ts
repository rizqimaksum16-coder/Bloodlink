import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Mendukung xAI Grok API (utama) — bisa juga Gemini via env var
const GROK_API_KEY = Deno.env.get("GROK_API_KEY") ?? Deno.env.get("XAI_API_KEY") ?? "";
const GROK_API_URL = Deno.env.get("GROK_API_URL") ?? "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = Deno.env.get("GROK_MODEL") ?? "grok-3-mini";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!GROK_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GROK_API_KEY not configured on server" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();

    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: messages array required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Trim history: system prompt + 8 pesan terakhir
    const systemMessages = messages.filter((m: { role: string }) => m.role === "system");
    const nonSystemMessages = messages.filter((m: { role: string }) => m.role !== "system");
    const trimmedMessages = [...systemMessages, ...nonSystemMessages.slice(-8)];

    const grokPayload = {
      model: body.model || GROK_MODEL,
      messages: trimmedMessages,
      temperature: body.temperature ?? 0.35,
      max_tokens: body.max_tokens ?? 500,
    };

    const grokResponse = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify(grokPayload),
    });

    if (!grokResponse.ok) {
      const errText = await grokResponse.text();
      console.error("Grok API error:", grokResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Grok API error: ${grokResponse.status}`, details: errText }),
        {
          status: grokResponse.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const grokData = await grokResponse.json();

    return new Response(JSON.stringify(grokData), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
