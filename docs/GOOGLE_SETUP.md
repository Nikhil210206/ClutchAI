# Connect real Google Calendar + Gmail (free, no card)

This makes ClutchAI's `schedule_event` and `draft_email` create **real** Calendar
events and Gmail drafts. Enabling these APIs and creating an OAuth client is
**free and needs no billing/card**. Consent screen stays in **Testing** mode with
you as a test user, so **no Google app verification is required**.

Do this once. ~10 minutes.

## 1. Create a project
1. Go to https://console.cloud.google.com/
2. Top bar → project dropdown → **New Project** → name it `clutchai` → **Create**.
3. Make sure the new project is selected in the top bar.

## 2. Enable the two APIs (free)
APIs & Services → **Library**, then enable each:
- Search **"Google Calendar API"** → **Enable**
- Search **"Gmail API"** → **Enable**

## 3. Configure the OAuth consent screen
APIs & Services → **OAuth consent screen**:
1. User type → **External** → **Create**.
2. App name: `ClutchAI`. User support email: your email. Developer contact: your email. **Save and Continue**.
3. Scopes page → **Save and Continue** (we request scopes at runtime; no need to add here).
4. **Test users** → **Add Users** → add `nikhilbalamurugan@gmail.com` → **Save and Continue**.
5. Leave **Publishing status = Testing**. (Do NOT publish — Testing avoids verification.)

## 4. Create the OAuth client (Web application)
APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID**:
1. Application type: **Web application**. Name: `ClutchAI Web`.
2. **Authorized redirect URIs** → **Add URI**:
   - `http://localhost:3033/api/auth/google/callback`
   - *(later, after deploy)* `https://YOUR-CLOUD-RUN-URL/api/auth/google/callback`
3. **Create**. Copy the **Client ID** and **Client secret**.

## 5. Put the credentials in `.env.local`
Add these two lines (keep your existing `GEMINI_*` lines):

```
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
```

## 6. Run on the matching port and connect
```bash
PORT=3033 npm run dev
```
1. Open http://localhost:3033
2. Click **Connect Calendar & Gmail** (top-right).
3. Pick your Google account. You'll see an **"unverified app"** warning — that's
   expected for Testing mode. Click **Advanced → Go to ClutchAI (unsafe)** and
   **Allow** the Calendar + Gmail permissions.
4. The badge turns green. Now run the agent — Calendar events and Gmail drafts
   are **real**, with working "Open in Google ↗" links in the action log.

## Notes
- The dev **port must be 3033** (or change the redirect URI to match your port) —
  the redirect URI has to match exactly.
- Scopes are intentionally tight: `calendar.events` (create events) and
  `gmail.compose` (create drafts). The agent cannot read or delete your data.
- The Gmail `compose` scope is "sensitive", but Testing-mode test users are
  allowed without verification.
