import crypto from "node:crypto";

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



const rateState = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;

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

const PRICE_PAISE = 49900;
const PRODUCT_NAME = "Dynexal Interview Master — 100 Questions";
const IS_LIVE_KEY = String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_live_");

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (isAllowedOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return "Basic " + Buffer.from(id + ":" + secret).toString("base64");
}

async function createOrder() {
  const receipt = "dynexal_" + Date.now().toString(36);
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader()
    },
    body: JSON.stringify({
      amount: PRICE_PAISE,
      currency: "INR",
      receipt,
      notes: { product: PRODUCT_NAME }
    })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("Razorpay order error:", response.status, data);
    const code = data?.error?.code ? String(data.error.code) : "";
    const description = data?.error?.description ? String(data.error.description) : "";
    const reason = [code, description].filter(Boolean).join(": ");
    throw new Error(reason ? "Razorpay: " + reason : "Unable to create payment order.");
  }
  return data;
}

async function saveVerifiedPurchase({ orderId, paymentId }) {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    console.warn("Supabase review storage is not configured.");
    return null;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };

  const existingResponse = await fetch(
    baseUrl + "/rest/v1/interview_purchases?razorpay_payment_id=eq." + encodeURIComponent(paymentId) + "&select=id,review_token",
    { headers }
  );
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    if (existing[0]?.review_token) return existing[0];
  }

  const reviewToken = crypto.randomBytes(32).toString("hex");
  const insertResponse = await fetch(baseUrl + "/rest/v1/interview_purchases", {
    method: "POST",
    headers,
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      product: PRODUCT_NAME,
      amount_paise: PRICE_PAISE,
      review_token: reviewToken
    })
  });
  if (!insertResponse.ok) {
    const error = await insertResponse.text();
    console.error("Supabase purchase storage error:", error);
    return null;
  }
  const rows = await insertResponse.json();
  return rows[0] || null;
}

async function getCapturedPayment(paymentId) {
  const response = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: authHeader() } });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payment?.error?.description || "Unable to find this Razorpay payment.");
  if (payment.status !== "captured") throw new Error("This Razorpay payment is not captured yet.");
  if (Number(payment.amount) !== PRICE_PAISE) throw new Error("This payment amount does not match the Dynexal Premium Interview Master.");
  if (!payment.order_id) throw new Error("This Razorpay payment is missing its order reference.");
  return payment;
}

async function verifyPayment({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error("Invalid payment signature.");
  }

  const response = await fetch(
    "https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId),
    { headers: { Authorization: authHeader() } }
  );
  const payment = await response.json();

  if (!response.ok) throw new Error("Unable to verify payment status.");
  if (payment.order_id !== orderId) throw new Error("Payment/order mismatch.");
  if (Number(payment.amount) !== PRICE_PAISE) throw new Error("Payment amount mismatch.");
  if (payment.status !== "captured") {
    throw new Error("Payment is not captured yet.");
  }

  return payment;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!rateLimit(req, res)) return res.status(429).json({ error: "Too many payment requests. Please wait a minute and try again." });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(500).json({
      error: "Payment service is not configured. Add Razorpay server keys in Vercel."
    });
  }

  if (!IS_LIVE_KEY) {
    return res.status(500).json({
      error: "Razorpay is still in Test Mode. Add the LIVE Razorpay Key ID and Key Secret in Vercel before accepting real payments."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const action = String(body?.action || "create").trim();

    if (action === "create") {
      const order = await createOrder();
      return res.status(200).json({
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: PRODUCT_NAME,
        mode: "live"
      });
    }

    if (action === "verify") {
      const orderId = String(body?.razorpay_order_id || "").trim();
      const paymentId = String(body?.razorpay_payment_id || "").trim();
      const signature = String(body?.razorpay_signature || "").trim();

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ error: "Payment verification data is incomplete." });
      }

      const payment = await verifyPayment({
        orderId,
        paymentId,
        signature
      });

      const purchase = await saveVerifiedPurchase({
        orderId: payment.order_id,
        paymentId: payment.id
      });

      return res.status(200).json({
        verified: true,
        paymentId: payment.id,
        orderId: payment.order_id,
        product: PRODUCT_NAME,
        reviewToken: purchase?.review_token || null
      });
    }

    if (action === "recover") {
      const paymentId = String(body?.payment_id || "").trim();
      if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) return res.status(400).json({ error: "Enter a valid Razorpay Payment ID starting with pay_." });
      const payment = await getCapturedPayment(paymentId);
      const purchase = await saveVerifiedPurchase({ orderId: payment.order_id, paymentId: payment.id });
      if (!purchase?.review_token) throw new Error("Payment was verified, but Premium access could not be saved. Please contact Dynexal support; do not pay again.");
      return res.status(200).json({ verified: true, paymentId: payment.id, orderId: payment.order_id, product: PRODUCT_NAME, reviewToken: purchase.review_token });
    }

    return res.status(400).json({ error: "Unknown payment action." });
  } catch (error) {
    console.error("Razorpay handler error:", error);
    return res.status(400).json({ error: error?.message || "Payment request failed." });
  }
}
