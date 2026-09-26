import crypto from "node:crypto";

const allowedOrigins = new Set([
  "https://dynexal.com",
  "https://www.dynexal.com"
]);

const PRICE_PAISE = 49900;
const PRODUCT_NAME = "Dynexal Interview Master — 60 Questions";

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
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
    throw new Error("Unable to create payment order.");
  }
  return data;
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

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(500).json({
      error: "Payment service is not configured. Add Razorpay server keys in Vercel."
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
        name: PRODUCT_NAME
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

      return res.status(200).json({
        verified: true,
        paymentId: payment.id,
        orderId: payment.order_id,
        product: PRODUCT_NAME
      });
    }

    return res.status(400).json({ error: "Unknown payment action." });
  } catch (error) {
    console.error("Razorpay handler error:", error);
    return res.status(400).json({ error: error?.message || "Payment request failed." });
  }
}
