import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Mendukung xAI Grok API (prioritas utama) dan Gemini API (fallback)
const GROK_API_KEY   = Deno.env.get("GROK_API_KEY") ?? Deno.env.get("XAI_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

// Gunakan Grok jika ada key-nya, jika tidak gunakan Gemini
const API_KEY  = GROK_API_KEY || GEMINI_API_KEY;
const API_URL  = GROK_API_KEY
  ? (Deno.env.get("GROK_API_URL")   ?? "https://api.x.ai/v1/chat/completions")
  : (Deno.env.get("GEMINI_API_URL") ?? "https://generativelanguage.googleapis.com/v1beta/chat/completions");
const API_MODEL = GROK_API_KEY
  ? (Deno.env.get("GROK_MODEL")   ?? "grok-3-mini")
  : (Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: "No API key configured. Set GROK_API_KEY or GEMINI_API_KEY in Supabase secrets." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
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
    const systemMessages    = messages.filter((m: { role: string }) => m.role === "system");
    const nonSystemMessages = messages.filter((m: { role: string }) => m.role !== "system");
    const trimmedMessages   = [...systemMessages, ...nonSystemMessages.slice(-8)];

    const apiPayload = {
      model:       body.model || API_MODEL,
      messages:    trimmedMessages,
      temperature: body.temperature ?? 0.35,
      max_tokens:  body.max_tokens  ?? 500,
    };

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(apiPayload),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error("AI API error:", apiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `API error: ${apiResponse.status}`, details: errText }),
        { status: apiResponse.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiResponse.json();

    return new Response(JSON.stringify(apiData), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
