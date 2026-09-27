const allowedOrigins = new Set([
  "https://dynexal.com",
  "https://www.dynexal.com"
]);

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  .trim()
  .replace(/^["']+|["']+$/g, "");
const ADMIN_KEY = String(process.env.ADMIN_REVIEW_KEY || "")
  .trim()
  .replace(/^["']+|["']+$/g, "");

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");
}

function dbHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: "Bearer " + SERVICE_KEY,
    "Content-Type": "application/json"
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Review service is not configured." });
  }

  try {
    if (req.method === "GET" && req.headers["x-admin-key"] === ADMIN_KEY && ADMIN_KEY) {
      const response = await fetch(
        SUPABASE_URL + "/rest/v1/interview_reviews?status=eq.pending&select=id,rating,reviewer_name,comment,source,status,created_at&order=created_at.desc",
        { headers: dbHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error("Unable to load pending reviews.");
      return res.status(200).json({ reviews: data });
    }

    if (req.method === "GET") {
      const response = await fetch(
        SUPABASE_URL + "/rest/v1/interview_reviews?status=eq.approved&select=rating,reviewer_name,comment,created_at&order=created_at.desc",
        { headers: dbHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error("Unable to load reviews.");
      return res.status(200).json({ reviews: data });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body?.action && body.action !== "submit") {
      if (!ADMIN_KEY || req.headers["x-admin-key"] !== ADMIN_KEY) {
        return res.status(401).json({ error: "Unauthorized." });
      }
      const reviewId = String(body?.review_id || "").trim();
      if (!reviewId) return res.status(400).json({ error: "Review ID is required." });
      const action = String(body.action).trim();
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
      if (!status) return res.status(400).json({ error: "Unknown review action." });

      const response = await fetch(
        SUPABASE_URL + "/rest/v1/interview_reviews?id=eq." + encodeURIComponent(reviewId),
        {
          method: "PATCH",
          headers: { ...dbHeaders(), Prefer: "return=representation" },
          body: JSON.stringify({ status })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error("Unable to update review.");
      return res.status(200).json({ updated: true, review: data?.[0] || null });
    }
    const token = String(body?.review_token || "").trim();
    const reviewerName = String(body?.reviewer_name || "").trim();
    const comment = String(body?.comment || "").trim();
    const rating = Number(body?.rating);

    if (!reviewerName || !comment || !Number.isInteger(rating)) {
      return res.status(400).json({ error: "Rating, name and comment are required." });
    }
    if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5." });
    if (reviewerName.length < 2 || reviewerName.length > 80) return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
    if (comment.length < 10 || comment.length > 1000) return res.status(400).json({ error: "Comment must be between 10 and 1000 characters." });

    let purchaseId = null;
    let source = "community";
    if (token) {
      const purchaseResponse = await fetch(
        SUPABASE_URL + "/rest/v1/interview_purchases?review_token=eq." + encodeURIComponent(token) + "&select=id",
        { headers: dbHeaders() }
      );
      const purchases = await purchaseResponse.json();
      if (!purchaseResponse.ok || !purchases[0]?.id) {
        return res.status(403).json({ error: "This premium review link is not valid." });
      }
      purchaseId = purchases[0].id;
      source = "premium";
    }

    const reviewResponse = await fetch(SUPABASE_URL + "/rest/v1/interview_reviews", {
      method: "POST",
      headers: { ...dbHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        purchase_id: purchaseId,
        rating,
        reviewer_name: reviewerName,
        comment,
        source,
        status: "pending"
      })
    });
    const reviewData = await reviewResponse.json();
    if (!reviewResponse.ok) {
      if (reviewData?.code === "23505") {
        return res.status(409).json({ error: "A review has already been submitted for this purchase." });
      }
      throw new Error("Unable to save review.");
    }

    return res.status(201).json({
      submitted: true,
      message: "Thank you. Your review has been submitted for approval."
    });
  } catch (error) {
    console.error("Review API error:", error);
    return res.status(400).json({ error: "Review request failed. Please try again." });
  }
}
