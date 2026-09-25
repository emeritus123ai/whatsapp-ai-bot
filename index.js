// WhatsApp AI Auto-Responder
// Connects WhatsApp Cloud API -> Groq AI -> sends reply back

const express = require("express");
const app = express();
app.use(express.json());

// ---- Config (set these as Environment Variables on Render, never hardcode) ----
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;           // any secret word you make up
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;       // your permanent System User token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;     // from API Setup page
const GROQ_API_KEY = process.env.GROQ_API_KEY;           // from console.groq.com

// Customize this to control how your AI behaves
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  "You are a friendly, helpful customer service assistant for a business on WhatsApp. Keep replies short (2-4 sentences), warm, and clear. If you don't know something specific about the business, say a team member will follow up.";

// Keep a short in-memory history per user so replies have context
// (resets if the server restarts — fine for a first version)
const conversations = {};

// ---------------------------------------------------------------------------
// 1. Webhook verification (Meta calls this once when you click "Verify and save")
// ---------------------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---------------------------------------------------------------------------
// 2. Receiving messages (Meta POSTs here every time a customer messages you)
// ---------------------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry/timeout
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return; // could be a status update, not an actual message

    const from = message.from; // customer's phone number
    const text = message.text?.body;

    if (!text) return; // skip non-text messages (images, audio, etc.) for now

    console.log(`Incoming from ${from}: ${text}`);

    const reply = await getAIReply(from, text);
    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error("Error handling incoming message:", err);
  }
});

// ---------------------------------------------------------------------------
// 3. Ask Groq (fast, free-tier LLM) for a reply
// ---------------------------------------------------------------------------
async function getAIReply(userId, userMessage) {
  if (!conversations[userId]) {
    conversations[userId] = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  conversations[userId].push({ role: "user", content: userMessage });

  // Keep only the last 10 messages so memory/cost stay small
  if (conversations[userId].length > 11) {
    conversations[userId] = [
      conversations[userId][0],
      ...conversations[userId].slice(-10),
    ];
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: conversations[userId],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Groq API error:", data);
    return "Sorry, I'm having trouble responding right now — a team member will follow up with you shortly.";
  }

  const aiText = data.choices?.[0]?.message?.content?.trim() ||
    "Sorry, could you rephrase that?";

  conversations[userId].push({ role: "assistant", content: aiText });
  return aiText;
}

// ---------------------------------------------------------------------------
// 4. Send the reply back via WhatsApp Cloud API
// ---------------------------------------------------------------------------
async function sendWhatsAppMessage(to, body) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error("WhatsApp send error:", data);
  } else {
    console.log(`Reply sent to ${to}`);
  }
}

// ---------------------------------------------------------------------------
// Health check (so Render/you can confirm the server is alive)
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("WhatsApp AI bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
