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

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  if (!publicKey) {
    return res.status(503).json({ error: "Web Push is not configured yet." });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    publicKey,
    enabled: true
  });
}
