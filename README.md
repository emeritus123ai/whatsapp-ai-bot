# WhatsApp AI Auto-Responder

Connects your WhatsApp Business number to a free AI model (Groq) so it can
automatically reply to customer messages.

## What you need before deploying

1. Your **permanent WhatsApp access token** (from Business Settings > System Users > Generate token)
2. Your **Phone Number ID** (from Meta App > WhatsApp > API Setup)
3. A **free Groq API key** — sign up at https://console.groq.com, go to "API Keys", create one
4. A **GitHub account** (free) — to hold this code so Render can deploy it

## Step 1: Get this code onto GitHub

1. Go to https://github.com/new, create a new repository (e.g. `whatsapp-ai-bot`), keep it Private
2. Upload these files to it (index.js, package.json, .env.example, README.md) — you can drag-and-drop them on the GitHub website using "uploading an existing file"

## Step 2: Deploy on Render

1. Go to https://render.com and sign up free (you can sign up with GitHub directly)
2. Click **New +** → **Web Service**
3. Connect your GitHub account, select the `whatsapp-ai-bot` repo
4. Fill in:
   - **Name:** whatsapp-ai-bot (or anything)
   - **Region:** closest to you
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Under **Environment Variables**, add each one from `.env.example` with your real values:
   - `VERIFY_TOKEN` → make up any secret word, e.g. `mySecret123`
   - `WHATSAPP_TOKEN` → your permanent token
   - `PHONE_NUMBER_ID` → your Phone Number ID
   - `GROQ_API_KEY` → your Groq key
6. Click **Create Web Service** and wait for it to deploy (a few minutes)
7. Once live, Render gives you a URL like `https://whatsapp-ai-bot-xxxx.onrender.com`

## Step 3: Connect it to Meta

1. Go back to your Meta App > WhatsApp > Configuration (or "Step 2. Production setup" > Configure Webhooks)
2. **Callback URL:** `https://whatsapp-ai-bot-xxxx.onrender.com/webhook` (your Render URL + `/webhook`)
3. **Verify token:** the exact same secret word you set as `VERIFY_TOKEN` on Render
4. Click **Verify and save** — it should succeed instantly
5. Under **Webhook fields**, subscribe to **messages**

## Step 4: Test it

Message your WhatsApp test number from your own phone. Within a couple
seconds, the AI should reply. Check Render's **Logs** tab if nothing happens —
it will show incoming messages and any errors.

## Notes

- Free Render services "sleep" after 15 minutes of no traffic, and take ~30
  seconds to wake up on the next message. Fine for testing; consider a paid
  tier ($7/mo) once you have real customers, to avoid delay.
- Conversation memory resets if the server restarts (normal on free tier
  sleep/wake). Good enough for a v1 — can be upgraded to a database later.
- Edit `SYSTEM_PROMPT` in your Render environment variables any time to
  change how the AI talks, without touching code.
