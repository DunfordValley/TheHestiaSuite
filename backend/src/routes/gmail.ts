import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { getOAuthClient, getStoredTokens, saveTokens, clearTokens } from '../services/gmail';

const router = Router();

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const tokens = await getStoredTokens();
    if (tokens?.refresh_token) {
      res.json({ connected: true, email: tokens.gmail_email });
    } else {
      res.json({ connected: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get Gmail status' });
  }
});

router.get('/auth', (_req: Request, res: Response) => {
  const auth = getOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.redirect('/settings?gmail=error');

  try {
    const auth = getOAuthClient();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth });
    const userInfo = await oauth2.userinfo.get();

    await saveTokens({
      gmail_email: userInfo.data.email ?? undefined,
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    });

    res.redirect('/settings?gmail=connected');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/settings?gmail=error');
  }
});

router.delete('/disconnect', async (_req: Request, res: Response) => {
  try {
    const tokens = await getStoredTokens();
    if (tokens?.access_token) {
      const auth = getOAuthClient();
      try { await auth.revokeToken(tokens.access_token); } catch { /* best-effort */ }
    }
    await clearTokens();
    res.json({ disconnected: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

export default router;
