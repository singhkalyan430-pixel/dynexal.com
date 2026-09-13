export default async function handler(req, res) {
  const allowedOrigins = new Set([
    "https://dynexal.com",
    "https://www.dynexal.com",
    "https://dynexal-ai-assistant.vercel.app"
  ]);

  const origin = req.headers.origin || "";

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "AI service is not configured."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const message = String(body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: "Message is too long."
      });
    }

    const systemPrompt = `
You are Dynexal AI Assistant, the technical assistant for Dynexal Technologies.

Focus mainly on:
- Microsoft Dynamics 365 Business Central
- AL development
- Tables, Pages, Page Extensions and Codeunits
- Event Subscribers
- APIs and integrations
- HttpClient
- JSON
- OAuth 2.0
- Webhooks
- RDLC reports
- Shopify and Business Central
- AI + Business Central
- Developer interview preparation

Give practical, clear and technically useful answers.
Use AL code examples when helpful.
Mention common mistakes and best practices when relevant.

If a question is unrelated to Business Central or related technology,
politely explain that Dynexal AI focuses on Business Central and related
development topics.

Do not invent facts. If uncertain, say so.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 900
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);

      return res.status(502).json({
        error: "AI provider request failed."
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "AI provider returned no answer."
      });
    }

    return res.status(200).json({
      answer
    });

  } catch (error) {
    console.error("Chat handler error:", error);

    return res.status(500).json({
      error: "Unable to process the request."
    });
  }
}
