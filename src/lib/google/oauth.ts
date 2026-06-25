// Google OAuth 2.0 for the single demo user.
//
// Consent screen is kept in "Testing" mode with the test account added, using
// tight scopes only — so no Google app verification is needed. The refresh
// token is held in a globalThis singleton (single-user demo). Swap to Firestore
// if multi-instance token sharing is ever needed.

import { google } from "googleapis";

// Derive the OAuth2 client type from googleapis itself, so it matches the
// google-auth-library version googleapis bundles (avoids a duplicate-package
// type conflict with the top-level google-auth-library).
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

// Tight scopes: create calendar events + compose/insert Gmail drafts only.
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.compose",
  "openid",
  "email",
];

interface TokenStore {
  refresh_token?: string;
  access_token?: string;
  expiry_date?: number;
  email?: string;
}

function tokenStore(): TokenStore {
  const g = globalThis as unknown as { __clutchGoogleTokens?: TokenStore };
  if (!g.__clutchGoogleTokens) g.__clutchGoogleTokens = {};
  return g.__clutchGoogleTokens;
}

export function isGoogleConnected(): boolean {
  return !!tokenStore().refresh_token;
}

export function connectedEmail(): string | null {
  return tokenStore().email ?? null;
}

export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

/** Build an OAuth2 client. `origin` lets the redirect URI follow the deployment. */
export function oauthClient(origin: string): OAuth2Client {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

export function authUrl(origin: string): string {
  return oauthClient(origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

export async function handleCallback(origin: string, code: string) {
  const client = oauthClient(origin);
  const { tokens } = await client.getToken(code);
  const store = tokenStore();
  if (tokens.refresh_token) store.refresh_token = tokens.refresh_token;
  store.access_token = tokens.access_token ?? undefined;
  store.expiry_date = tokens.expiry_date ?? undefined;
  try {
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    store.email = me.data.email ?? undefined;
  } catch {
    // email lookup is best-effort
  }
}

/** Returns an authorized client, or null if the user hasn't connected yet. */
export function authorizedClient(origin: string): OAuth2Client | null {
  const store = tokenStore();
  if (!store.refresh_token) return null;
  const client = oauthClient(origin);
  client.setCredentials({
    refresh_token: store.refresh_token,
    access_token: store.access_token,
    expiry_date: store.expiry_date,
  });
  return client;
}

export function disconnectGoogle() {
  const g = globalThis as unknown as { __clutchGoogleTokens?: TokenStore };
  g.__clutchGoogleTokens = {};
}
