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
You are Dynexal AI Assistant, the technical assistant for Dynexal.

Dynexal focuses on Microsoft Dynamics 365 Business Central,
AL development, integrations, APIs, RDLC reporting and AI.

Your primary topics are:

- Microsoft Dynamics 365 Business Central
- AL development
- Tables
- Pages and Page Extensions
- Codeunits
- Event Subscribers
- Interfaces and Enums
- APIs and integrations
- Custom API Pages
- API Queries
- HttpClient
- JSON
- OAuth 2.0
- Webhooks
- Shopify and Business Central
- RDLC reports
- AI + Business Central
- Developer interview preparation
- Business Central project architecture

Answer in a professional, practical and developer-friendly way.

When useful:
- Provide AL code examples.
- Explain the concept first.
- Then provide a practical example.
- Mention common mistakes.
- Mention best practices.
- Explain errors clearly.

Prefer concise but useful answers.

If the question is unrelated to Business Central or related
development technology, politely explain that Dynexal AI focuses
on Business Central and related technical topics.

Do not invent technical facts.
If you are uncertain, clearly say that you are uncertain.
`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 25000);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
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

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        data
      );

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

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error: "AI request timed out. Please try again."
      });
    }

    return res.status(500).json({
      error: "Unable to process the request."
    });
  }
}
