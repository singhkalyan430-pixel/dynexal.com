import webpush from "web-push";

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token");
}

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function authorized(req) {
  const expected = String(process.env.PUSH_ADMIN_TOKEN || "").trim();
  if (!expected) return false;

  const authHeader = String(req.headers.authorization || "");
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = String(req.headers["x-admin-token"] || "").trim();
  return bearer === expected || headerToken === expected;
}

async function supabaseRequest(path, options = {}) {
  const baseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!baseUrl || !serviceKey) throw new Error("Supabase is not configured.");

  return fetch(baseUrl + path, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function getSubscriptions() {
  const response = await supabaseRequest(
    "/rest/v1/push_subscriptions?active=eq.true&select=id,endpoint,p256dh,auth"
  );
  if (!response.ok) throw new Error("Unable to load push subscribers.");
  return response.json();
}

async function deactivate(id) {
  await supabaseRequest(
    "/rest/v1/push_subscriptions?id=eq." + encodeURIComponent(id),
    {
      method: "PATCH",
      body: JSON.stringify({
        active: false,
        updated_at: new Date().toISOString()
      })
    }
  );
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" });

  const vapidPublic = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const vapidPrivate = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const vapidSubject = String(process.env.VAPID_SUBJECT || "mailto:notifications@dynexal.com").trim();

  if (!vapidPublic || !vapidPrivate) {
    return res.status(503).json({ error: "VAPID keys are not configured in Vercel." });
  }

  try {
    const body = parseBody(req);

    if (String(body.action || "send") === "stats") {
      const rows = await getSubscriptions();
      return res.status(200).json({ active: rows.length });
    }

    const title = String(body.title || "Dynexal Technologies").trim().slice(0, 100);
    const message = String(body.body || "New updates are available on Dynexal.").trim().slice(0, 300);
    const url = String(body.url || "https://dynexal.com/").trim().slice(0, 500);
    const tag = String(body.tag || "dynexal-update").trim().slice(0, 80);

    let targetUrl;
    try {
      targetUrl = new URL(url, "https://dynexal.com/");
      if (!["https:", "http:"].includes(targetUrl.protocol)) throw new Error("bad protocol");
    } catch (_) {
      return res.status(400).json({ error: "Invalid notification URL." });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const rows = await getSubscriptions();
    const payload = JSON.stringify({
      title,
      body: message,
      url: targetUrl.href,
      tag,
      icon: "https://dynexal.com/assets/dynexal-mark.svg",
      badge: "https://dynexal.com/assets/dynexal-mark.svg"
    });

    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      const results = await Promise.allSettled(
        batch.map(async row => {
          try {
            await webpush.sendNotification(
              {
                endpoint: row.endpoint,
                keys: { p256dh: row.p256dh, auth: row.auth }
              },
              payload,
              { TTL: 86400 }
            );
            return { ok: true };
          } catch (error) {
            const statusCode = Number(error?.statusCode || 0);
            if (statusCode === 404 || statusCode === 410) {
              await deactivate(row.id);
              return { ok: false, removed: true };
            }
            return { ok: false };
          }
        })
      );

      for (const result of results) {
        if (result.status !== "fulfilled" || !result.value?.ok) {
          failed += 1;
          if (result.status === "fulfilled" && result.value?.removed) removed += 1;
        } else {
          sent += 1;
        }
      }
    }

    return res.status(200).json({
      ok: true,
      attempted: rows.length,
      sent,
      failed,
      removed
    });
  } catch (error) {
    console.error("Push send error:", error);
    return res.status(500).json({ error: error?.message || "Unable to send push notification." });
  }
}
