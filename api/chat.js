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

// Dynexal AI Assistant
(function () {
  if (document.getElementById("dynexal-ai-launcher")) return;

  const API_URL =
    "https://dynexal-ai-assistant.vercel.app/api/chat";

  const style = document.createElement("style");

  style.textContent = `
    #dynexal-ai-launcher {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 9998;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, #1d4ed8, #06b6d4);
      color: #fff;
      padding: 13px 18px;
      font: 700 14px/1 system-ui, sans-serif;
      box-shadow: 0 12px 30px rgba(0,0,0,.30);
      cursor: pointer;
    }

    #dynexal-ai-panel {
      position: fixed;
      right: 22px;
      bottom: 78px;
      width: min(390px, calc(100vw - 28px));
      height: min(600px, calc(100vh - 110px));
      z-index: 9999;
      display: none;
      flex-direction: column;
      background: #0b1220;
      color: #eaf2ff;
      border: 1px solid #263a5b;
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      overflow: hidden;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    }

    #dynexal-ai-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px 16px;
      background: linear-gradient(135deg, #101d36, #0e2942);
      border-bottom: 1px solid #263a5b;
    }

    #dynexal-ai-head strong {
      font-size: 15px;
    }

    .dynexal-ai-sub {
      font-size: 11px;
      color: #91a4c2;
      margin-top: 3px;
    }

    #dynexal-ai-close {
      border: 0;
      background: transparent;
      color: #b9c7dc;
      font-size: 20px;
      cursor: pointer;
    }

    #dynexal-ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
    }

    .dynexal-ai-msg {
      max-width: 86%;
      padding: 10px 12px;
      margin: 0 0 10px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .dynexal-ai-bot {
      background: #13223a;
      border: 1px solid #243c60;
      margin-right: auto;
    }

    .dynexal-ai-user {
      background: #1d4ed8;
      color: #fff;
      margin-left: auto;
    }

    #dynexal-ai-quick {
      display: flex;
      gap: 7px;
      overflow-x: auto;
      padding: 0 12px 10px;
    }

    .dynexal-ai-q {
      white-space: nowrap;
      border: 1px solid #2a4267;
      background: #101c31;
      color: #cfe0f8;
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 11px;
      cursor: pointer;
    }

    #dynexal-ai-form {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #263a5b;
      background: #0a111e;
    }

    #dynexal-ai-input {
      min-width: 0;
      flex: 1;
      border: 1px solid #2a4267;
      border-radius: 12px;
      background: #111c2e;
      color: #fff;
      padding: 10px 11px;
      outline: none;
    }

    #dynexal-ai-input::placeholder {
      color: #8091ab;
    }

    #dynexal-ai-send {
      border: 0;
      border-radius: 12px;
      background: #2563eb;
      color: #fff;
      padding: 0 14px;
      font-weight: 700;
      cursor: pointer;
    }

    #dynexal-ai-send:disabled {
      opacity: .6;
      cursor: wait;
    }

    @media (max-width: 600px) {
      #dynexal-ai-launcher {
        right: 14px;
        bottom: 14px;
      }

      #dynexal-ai-panel {
        right: 10px;
        bottom: 68px;
        width: calc(100vw - 20px);
        height: min(70vh, 600px);
      }
    }
  `;

  document.head.appendChild(style);

  const launcher = document.createElement("button");

  launcher.id = "dynexal-ai-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open Dynexal AI Assistant");
  launcher.textContent = "🤖 Ask Dynexal AI";

  const panel = document.createElement("section");

  panel.id = "dynexal-ai-panel";
  panel.setAttribute("aria-label", "Dynexal AI Assistant");

  panel.innerHTML = `
    <div id="dynexal-ai-head">
      <div>
        <strong>🤖 Dynexal AI</strong>
        <div class="dynexal-ai-sub">
          Business Central • AL • Integrations • AI
        </div>
      </div>

      <button
        id="dynexal-ai-close"
        type="button"
        aria-label="Close Dynexal AI"
      >
        ×
      </button>
    </div>

    <div id="dynexal-ai-messages"></div>

    <div id="dynexal-ai-quick">
      <button class="dynexal-ai-q" type="button">
        Event Subscriber?
      </button>

      <button class="dynexal-ai-q" type="button">
        Custom API?
      </button>

      <button class="dynexal-ai-q" type="button">
        HttpClient?
      </button>

      <button class="dynexal-ai-q" type="button">
        RDLC Reports?
      </button>
    </div>

    <form id="dynexal-ai-form">
      <input
        id="dynexal-ai-input"
        type="text"
        maxlength="2000"
        autocomplete="off"
        placeholder="Ask a Business Central question..."
      />

      <button id="dynexal-ai-send" type="submit">
        Send
      </button>
    </form>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const messages =
    panel.querySelector("#dynexal-ai-messages");

  const input =
    panel.querySelector("#dynexal-ai-input");

  const form =
    panel.querySelector("#dynexal-ai-form");

  const close =
    panel.querySelector("#dynexal-ai-close");

  const send =
    panel.querySelector("#dynexal-ai-send");

  function addMessage(text, type) {
    const element = document.createElement("div");

    element.className =
      "dynexal-ai-msg " +
      (type === "user"
        ? "dynexal-ai-user"
        : "dynexal-ai-bot");

    element.textContent = text;

    messages.appendChild(element);

    messages.scrollTop = messages.scrollHeight;

    return element;
  }

  addMessage(
    "Hi! I'm Dynexal AI 👋\\n\\nAsk me about Microsoft Dynamics 365 Business Central, AL, APIs, integrations, RDLC, Shopify or AI.",
    "bot"
  );

  launcher.addEventListener("click", function () {
    panel.style.display = "flex";
    input.focus();
  });

  close.addEventListener("click", function () {
    panel.style.display = "none";
  });

  panel.querySelectorAll(".dynexal-ai-q").forEach(function (button) {
    button.addEventListener("click", function () {
      input.value = button.textContent.trim();
      form.requestSubmit();
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = input.value.trim();

    if (!message) return;

    addMessage(message, "user");

    input.value = "";
    input.disabled = true;
    send.disabled = true;

    const loading = addMessage("Thinking…", "bot");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message
        })
      });

      const data = await response.json();

      loading.remove();

      if (!response.ok) {
        throw new Error(
          data.error || "AI request failed."
        );
      }

      addMessage(
        data.answer ||
          "Sorry, I could not generate an answer.",
        "bot"
      );

    } catch (error) {
      loading.textContent =
        "Sorry, the AI assistant is temporarily unavailable. Please try again.";

      console.error(
        "Dynexal AI error:",
        error
      );

    } finally {
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  });
})();
