import { getStoredTokens, getAuthenticatedGmailClient } from './gmail';
import { pool } from '../db';

function extractEmail(str: string): string {
  const match = str.match(/<(.+?)>/) ?? str.match(/([^\s]+@[^\s]+)/);
  return (match?.[1] ?? str).toLowerCase().trim();
}

export async function syncGmailInbox(): Promise<void> {
  try {
    const settings = await getStoredTokens();
    if (!settings || !settings.refresh_token) return;

    const gmail = await getAuthenticatedGmailClient();

    const contactsResult = await pool.query(
      'SELECT id, name, email FROM contacts WHERE email IS NOT NULL'
    );
    if (contactsResult.rows.length === 0) return;

    const contactMap = new Map<string, { id: number; name: string }>();
    for (const row of contactsResult.rows) {
      contactMap.set(row.email.toLowerCase(), { id: row.id, name: row.name });
    }

    const after = settings.last_synced_at
      ? Math.floor(new Date(settings.last_synced_at).getTime() / 1000)
      : Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    const listResult = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${after}`,
      maxResults: 100,
    });

    const messages = listResult.data.messages ?? [];

    for (const { id: messageId } of messages) {
      if (!messageId) continue;

      const exists = await pool.query(
        'SELECT id FROM interactions WHERE gmail_message_id = $1',
        [messageId]
      );
      if (exists.rows.length > 0) continue;

      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = msg.data.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

      const fromRaw = getHeader('From');
      const toRaw = getHeader('To');
      const subject = getHeader('Subject') || '(no subject)';
      const from = extractEmail(fromRaw);

      let contactId: number | null = null;
      let direction: 'received' | 'sent' | null = null;

      if (from && contactMap.has(from)) {
        contactId = contactMap.get(from)!.id;
        direction = 'received';
      } else {
        for (const part of toRaw.split(',')) {
          const addr = extractEmail(part.trim());
          if (addr && contactMap.has(addr)) {
            contactId = contactMap.get(addr)!.id;
            direction = 'sent';
            break;
          }
        }
      }

      if (!contactId || !direction) continue;

      await pool.query(
        `INSERT INTO interactions
           (contact_id, type, summary, occurred_at,
            gmail_message_id, email_subject, email_to, email_from, direction, source)
         VALUES ($1, 'email', $2, NOW(), $3, $4, $5, $6, $7, 'gmail_sync')
         ON CONFLICT (gmail_message_id) DO NOTHING`,
        [contactId, `Email: ${subject}`, messageId, subject, toRaw, fromRaw, direction]
      );
    }

    await pool.query(
      'UPDATE gmail_settings SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1',
      [settings.id]
    );

    console.log(`Gmail sync: processed ${messages.length} messages`);
  } catch (err) {
    console.error('Gmail sync error:', err);
  }
}

export function startSyncPoller(intervalMs = parseInt(process.env.GMAIL_SYNC_INTERVAL_MS ?? '300000')): void {
  setTimeout(() => {
    syncGmailInbox();
    setInterval(syncGmailInbox, intervalMs);
  }, 5000);
}
