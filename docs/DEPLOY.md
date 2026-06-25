# Deploy ClutchAI to Google Cloud Run (from scratch)

The hackathon requires hosting on **Google Cloud**. Cloud Run has an always-free
tier that easily covers a demo, and new accounts get **$300 free credit / 90
days** — so real spend is **$0**. Google does require a **card on file** to
activate the free trial (you won't be charged within the free tier, and you can
leave the account un-upgraded so it can never auto-bill).

## 0. One-time account setup (the card step)
1. Go to https://console.cloud.google.com/ and start the **free trial** when
   prompted (this is where the card is added — $0 charged).
2. Reuse the `clutchai` project from `GOOGLE_SETUP.md` (or create one).

## 1. Install + auth the gcloud CLI
```bash
brew install --cask google-cloud-sdk      # macOS (Homebrew)
gcloud auth login                          # opens browser
gcloud config set project clutchai         # use your project id
```

## 2. Enable the required APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  calendar-json.googleapis.com \
  gmail.googleapis.com
```

## 3. Create Firestore (Native mode)
```bash
gcloud firestore databases create --location=nam5
```
(Pick a location near you; `nam5` = US multi-region. Use `eur3` for EU, etc.)

## 4. Deploy from source (Cloud Build builds the Dockerfile)
```bash
gcloud run deploy clutchai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,GEMINI_MODEL=gemini-2.5-flash"
```
Cloud Run sets `GOOGLE_CLOUD_PROJECT` automatically, so the app switches from the
in-memory store to **Firestore** in production. The command prints a public URL.

> For secrets, prefer Secret Manager over `--set-env-vars` for the API key and
> OAuth secret. For a hackathon demo, env vars are acceptable.

## 5. Wire OAuth + public origin for the deployed URL
After the first deploy you have a URL like `https://clutchai-xxxx.run.app`.
1. In **APIs & Services → Credentials → your OAuth client**, add an authorized
   redirect URI: `https://clutchai-xxxx.run.app/api/auth/google/callback`.
2. Redeploy with the public origin + OAuth creds set:
```bash
gcloud run deploy clutchai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,GEMINI_MODEL=gemini-2.5-flash,PUBLIC_ORIGIN=https://clutchai-xxxx.run.app,GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=..."
```

## 6. Verify
- Open the URL in an incognito window → the app loads publicly.
- Run the agent → tasks/actions persist in Firestore.
- Connect Google → calendar events + Gmail drafts are real, with working links.

## Keeping it live for judging
The deployed link must stay public through the evaluation period. Cloud Run keeps
the revision serving; don't delete the service. Free-tier limits are far above
demo traffic.

## Cost guardrails ($0)
- Stay on the free trial (don't click "Upgrade").
- Cloud Run: scales to zero when idle; free tier covers 2M requests/month.
- Firestore: free tier covers ~50K reads / 20K writes per day.
- Gemini: free AI Studio key (no billing) — independent of Cloud billing.
