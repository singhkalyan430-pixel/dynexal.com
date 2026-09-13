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

    // Dynexal knowledge index. These are public articles on dynexal.com.
    const knowledge = [
      {
        title: "Getting Started with AL Development in Business Central",
        url: "https://dynexal.com/articles/getting-started-with-al.html",
        keywords: ["al", "getting started", "development", "extension"]
      },
      {
        title: "AL Tables in Business Central: Complete Beginner Guide",
        url: "https://dynexal.com/articles/al-tables-business-central.html",
        keywords: ["table", "tables", "record", "field"]
      },
      {
        title: "Creating List and Card Pages in AL",
        url: "https://dynexal.com/articles/creating-list-and-card-pages-al.html",
        keywords: ["list page", "card page", "page"]
      },
      {
        title: "Page Extensions in Business Central",
        url: "https://dynexal.com/articles/page-extensions-business-central.html",
        keywords: ["page extension", "page extensions", "extend page"]
      },
      {
        title: "Codeunits in Business Central: Complete Beginner Guide",
        url: "https://dynexal.com/articles/codeunits-business-central.html",
        keywords: ["codeunit", "codeunits"]
      },
      {
        title: "AL Event Subscribers in Business Central: Complete Guide",
        url: "https://dynexal.com/articles/al-event-subscribers-business-central.html",
        keywords: ["event subscriber", "event subscribers", "subscriber", "integration event", "event"]
      },
      {
        title: "Business Central API Integration: Complete Beginner Guide",
        url: "https://dynexal.com/articles/business-central-api-integration.html",
        keywords: ["api", "rest", "integration", "crud", "odata"]
      },
      {
        title: "Business Central Custom API Page",
        url: "https://dynexal.com/articles/business-central-custom-api-page.html",
        keywords: ["custom api", "api page", "page type api", "apiversion", "entitysetname"]
      },
      {
        title: "HttpClient in Business Central AL: REST API Integration Guide",
        url: "https://dynexal.com/articles/httpclient-business-central-al.html",
        keywords: ["httpclient", "http client", "get", "post", "patch", "delete"]
      },
      {
        title: "JSON Handling in Business Central AL: Complete Guide",
        url: "https://dynexal.com/articles/json-handling-business-central-al.html",
        keywords: ["json", "jsonobject", "jsonarray", "jsontoken", "jsvalue"]
      },
      {
        title: "OAuth 2.0 Authentication in Business Central AL",
        url: "https://dynexal.com/articles/oauth-2-authentication-business-central-al.html",
        keywords: ["oauth", "oauth 2", "authentication", "entra", "access token", "client credentials"]
      },
      {
        title: "Business Central Webhooks: Complete Integration Guide",
        url: "https://dynexal.com/articles/business-central-webhooks.html",
        keywords: ["webhook", "webhooks", "subscription", "validationtoken", "notification"]
      },
      {
        title: "Shopify and Business Central Integration: Complete Guide",
        url: "https://dynexal.com/articles/shopify-business-central-integration.html",
        keywords: ["shopify", "e-commerce", "ecommerce", "orders", "inventory"]
      },
      {
        title: "RDLC Reports in Business Central: Complete Beginner Guide",
        url: "https://dynexal.com/articles/rdlc-reports-business-central.html",
        keywords: ["rdlc", "report", "reports", "report builder", "dataset", "dataitem"]
      },
      {
        title: "AI in Business Central: Complete Beginner Guide",
        url: "https://dynexal.com/articles/ai-business-central-complete-guide.html",
        keywords: ["ai", "copilot", "azure openai", "mcp", "ai agent", "ai agents"]
      },
      {
        title: "Interfaces in Business Central AL: Complete Beginner Guide",
        url: "https://dynexal.com/articles/interfaces-business-central-al.html",
        keywords: ["interface", "interfaces", "implements", "polymorphism"]
      }
    ];

    const normalized = message.toLowerCase();
    const sources = knowledge
      .map(article => ({
        ...article,
        score: article.keywords.reduce(
          (score, keyword) => score + (normalized.includes(keyword) ? 1 : 0),
          0
        )
      }))
      .filter(article => article.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ title, url }) => ({ title, url }));

    const knowledgeText = knowledge
      .map(article => `- ${article.title} | ${article.url} | topics: ${article.keywords.join(", ")}`)
      .join("\n");

    const systemPrompt = `
You are Dynexal AI Assistant, the technical assistant for Dynexal.

Dynexal focuses on Microsoft Dynamics 365 Business Central,
AL development, integrations, APIs, RDLC reporting and AI.

Your primary topics are:
- Microsoft Dynamics 365 Business Central
- AL development
- Tables, Pages, Page Extensions and Codeunits
- Event Subscribers, Interfaces and Enums
- APIs, Custom API Pages and API Queries
- HttpClient, JSON and OAuth 2.0
- Webhooks
- Shopify and Business Central
- RDLC reports
- AI + Business Central
- Developer interview preparation
- Business Central project architecture

Dynexal's public learning articles are listed below. Use this index as
first-party Dynexal context when the visitor asks about a matching topic.
Do not claim that you read an article in full unless its relevant content
is actually included in the conversation. You may recommend the matching
article as further reading.

${knowledgeText}

Answer in a professional, practical and developer-friendly way.
When useful:
- Explain the concept first.
- Provide correct AL code examples.
- Mention common mistakes and best practices.
- Give practical implementation guidance.
- Keep answers concise but useful.

If a Dynexal article clearly matches the question, naturally mention that
the visitor can read the related Dynexal tutorial for a deeper walkthrough.

If the question is unrelated to Business Central or related development
technology, politely explain that Dynexal AI focuses on Business Central
and related technical topics.

Do not invent technical facts. If uncertain, clearly say that you are uncertain.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

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
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 900
          }
        })
      }
    );

    clearTimeout(timeout);

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
      answer,
      sources
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
