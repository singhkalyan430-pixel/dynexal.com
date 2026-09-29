import premiumQuestions from "../data/premium-questions.js";

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

async function findPurchase({ token, paymentId }) {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Premium access storage is not configured.");

  const filter = token
    ? "review_token=eq." + encodeURIComponent(token)
    : "razorpay_payment_id=eq." + encodeURIComponent(paymentId);

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

  const token = String(req.query?.token || "").trim();
  const paymentId = String(req.query?.payment_id || "").trim();

  if (!token && !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    return res.status(401).json({ error: "Premium access token or payment ID is missing." });
  }
  if (token && !tokenIsValid(token)) {
    return res.status(401).json({ error: "Premium access token is invalid." });
  }

  try {
    const purchase = await findPurchase({ token: token || "", paymentId });
    if (!purchase) {
      return res.status(403).json({ error: "No verified Premium Interview Master purchase was found." });
    }

    return res.status(200).json({
      verified: true,
      product: purchase.product,
      paymentId: purchase.razorpay_payment_id,
      reviewToken: purchase.review_token || null,
      questionCount: premiumQuestions.length,
      questions: premiumQuestions
    });
  } catch (error) {
    console.error("Premium access error:", error);
    return res.status(500).json({ error: error?.message || "Premium access verification failed." });
  }
}
