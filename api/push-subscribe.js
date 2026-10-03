const allowedOrigins = new Set([
  "https://dynexal.com",
  "https://www.dynexal.com"
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  const previewOrigin = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "";
  return previewOrigin === origin;
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (isAllowedOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const baseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!baseUrl || !serviceKey) {
    return res.status(500).json({ error: "Push subscription storage is not configured." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const subscription = body.subscription || body;

    const endpoint = String(subscription?.endpoint || "").trim();
    const p256dh = String(subscription?.keys?.p256dh || "").trim();
    const auth = String(subscription?.keys?.auth || "").trim();

    if (!endpoint.startsWith("https://") || endpoint.length > 2048) {
      return res.status(400).json({ error: "Invalid push endpoint." });
    }
    if (!p256dh || p256dh.length > 512 || !auth || auth.length > 512) {
      return res.status(400).json({ error: "Invalid push subscription keys." });
    }

    const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);

    const response = await fetch(
      baseUrl + "/rest/v1/push_subscriptions?on_conflict=endpoint",
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: "Bearer " + serviceKey,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
          active: true
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Push subscription storage error:", error);
      return res.status(502).json({ error: "Unable to save push subscription." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return res.status(400).json({ error: "Invalid subscription request." });
  }
}
