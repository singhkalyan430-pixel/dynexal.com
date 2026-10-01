import premiumQuestions from "../data/premium-questions.js";

const rateState = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown").split(",")[0].trim().slice(0, 80) || "unknown";
}

function rateLimit(req, res) {
  const now = Date.now();
  const key = clientIp(req);
  const entry = rateState.get(key);
  if (!entry || now - entry.start >= RATE_WINDOW_MS) { rateState.set(key, { start: now, count: 1 }); return true; }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) { res.setHeader("Retry-After", "60"); return false; }
  return true;
}

const allowedOrigins = new Set([
  "https://dynexal.com",
  "https://www.dynexal.com"
]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function tokenIsValid(token) {
  return /^[a-f0-9]{64}$/i.test(token);
}

async function findPurchase({ token }) {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Premium access storage is not configured.");

  const filter = "review_token=eq." + encodeURIComponent(token);

  const url = baseUrl +
    "/rest/v1/interview_purchases?" +
    filter +
    "&select=id,razorpay_payment_id,product,amount_paise,review_token&limit=1";

  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey
    }
  });

  if (!response.ok) {
    console.error("Premium purchase lookup failed:", response.status, await response.text());
    throw new Error("Unable to verify premium access.");
  }

  const rows = await response.json();
  return rows[0] || null;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, res)) return res.status(429).json({ error: "Too many Premium access requests. Please wait a minute and try again." });

  const token = String(req.query?.token || "").trim();

  if (!token) {
    return res.status(401).json({ error: "Premium access token is required. Use the Premium recovery flow if needed." });
  }
  if (token && !tokenIsValid(token)) {
    return res.status(401).json({ error: "Premium access token is invalid." });
  }

  try {
    const purchase = await findPurchase({ token });
    if (!purchase) {
      return res.status(403).json({ error: "No verified Premium Interview Master purchase was found." });
    }

    return res.status(200).json({
      verified: true,
      product: purchase.product,
      reviewToken: purchase.review_token || null,
      questionCount: premiumQuestions.length,
      questions: premiumQuestions
    });
  } catch (error) {
    console.error("Premium access error:", error);
    return res.status(500).json({ error: error?.message || "Premium access verification failed." });
  }
}
