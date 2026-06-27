import { google } from 'googleapis';
import { pool } from '../db';

interface TokenRow {
  id: number;
  gmail_email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: Date | null;
  history_id: string | null;
  last_synced_at: Date | null;
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function getStoredTokens(): Promise<TokenRow | null> {
  const result = await pool.query('SELECT * FROM gmail_settings LIMIT 1');
  return result.rows[0] ?? null;
}

export async function saveTokens(data: Partial<Omit<TokenRow, 'id'>>): Promise<void> {
  const existing = await pool.query('SELECT id FROM gmail_settings LIMIT 1');

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO gmail_settings
         (gmail_email, access_token, refresh_token, token_expiry, history_id, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.gmail_email ?? null,
        data.access_token ?? null,
        data.refresh_token ?? null,
        data.token_expiry ?? null,
        data.history_id ?? null,
        data.last_synced_at ?? null,
      ]
    );
    return;
  }

  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, val] of Object.entries(data)) {
    sets.push(`${key} = $${i++}`);
    values.push(val ?? null);
  }
  values.push(existing.rows[0].id);
  await pool.query(
    `UPDATE gmail_settings SET ${sets.join(', ')} WHERE id = $${i}`,
    values
  );
}

export async function clearTokens(): Promise<void> {
  await pool.query('DELETE FROM gmail_settings');
}

export async function getAuthenticatedGmailClient() {
  const tokens = await getStoredTokens();
  if (!tokens?.refresh_token) {
    throw new Error('Gmail not connected');
  }

  const auth = getOAuthClient();
  auth.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.token_expiry ? tokens.token_expiry.getTime() : undefined,
  });

  auth.on('tokens', async (newTokens) => {
    await saveTokens({
      access_token: newTokens.access_token ?? undefined,
      token_expiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
    });
  });

  return google.gmail({ version: 'v1', auth });
}
