// Secure AI editing endpoint for Emmanuel Career Studio.
// Deploy as: supabase functions deploy admin-ai
// Requires the project's SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY environment variables (provided by Supabase).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(pw: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase function environment is incomplete.");
  const r = await fetch(url + "/rest/v1/rpc/admin_list_reviews", {
    method: "POST",
    headers: { apikey: anon, Authorization: "Bearer " + anon, "Content-Type": "application/json" },
    body: JSON.stringify({ pw }),
  });
  if (!r.ok) throw new Error("Admin authentication failed. Sign in again and retry.");
}

async function serviceRequest(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) throw new Error("Supabase service environment is incomplete.");
  return await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: service,
      Authorization: "Bearer " + service,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json();
    const pw = typeof body.pw === "string" ? body.pw : "";
    if (!pw || pw.length > 512) return reply({ error: "Please sign in again." }, 401);
    await verifyAdmin(pw);

    if (body.action === "save_key") {
      const key = typeof body.key === "string" ? body.key.trim() : "";
      if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) {
        return reply({ error: "That does not look like a valid OpenAI API key." }, 400);
      }
      const saved = await serviceRequest("admin_ai_secrets?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: 1, api_key: key, updated_at: new Date().toISOString() }),
      });
      if (!saved.ok) return reply({ error: "Could not store the key securely. Apply the database migration and retry." }, 500);
      return reply({ ok: true });
    }

    if (body.action === "edit") {
      const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
      const html = typeof body.html === "string" ? body.html : "";
      if (!instruction || instruction.length > 1800) return reply({ error: "Enter an instruction of 1,800 characters or fewer." }, 400);
      if (!html || html.length > 30000) return reply({ error: "The selected section is empty or too large to edit." }, 400);

      const stored = await serviceRequest("admin_ai_secrets?id=eq.1&select=api_key");
      if (!stored.ok) return reply({ error: "Could not retrieve the saved key." }, 500);
      const rows = await stored.json();
      const key = rows?.[0]?.api_key;
      if (!key) return reply({ error: "No OpenAI key saved yet. Add one in the Save tab first." }, 400);

      const ai = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            { role: "system", content: "You edit one HTML section of a website. Return ONLY the edited HTML. Keep existing classes, IDs, links and layout unless the instruction asks to change them. Do not add script tags, inline event handlers, javascript: URLs, forms that submit data, or markdown fences. Preserve meaningful content that the instruction does not ask to change." },
            { role: "user", content: "Instruction: " + instruction + "\n\nHTML to edit:\n" + html },
          ],
        }),
      });
      const result = await ai.json();
      if (!ai.ok) {
        const message = result?.error?.message || "The OpenAI request failed.";
        return reply({ error: message.slice(0, 350) }, 502);
      }
      const output = result?.choices?.[0]?.message?.content;
      if (typeof output !== "string" || !output.trim()) return reply({ error: "The AI returned an empty edit." }, 502);
      const clean = output.replace(/^\s*```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      if (/<\s*script\b|\son\w+\s*=|javascript\s*:/i.test(clean)) {
        return reply({ error: "The proposed HTML did not pass the safety check. Try a simpler instruction." }, 422);
      }
      return reply({ html: clean });
    }

    return reply({ error: "Unknown action." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const status = message.includes("authentication failed") ? 401 : 500;
    return reply({ error: message }, status);
  }
});
