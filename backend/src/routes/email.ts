import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db';
import { getAuthenticatedGmailClient } from '../services/gmail';

const router = Router();

router.post('/send', async (req: Request, res: Response) => {
  const { contact_id, deal_id, to, subject, body } = req.body;
  if (!contact_id || !to || !subject || !body) {
    return res.status(400).json({ error: 'contact_id, to, subject, and body are required' });
  }

  let gmail: Awaited<ReturnType<typeof getAuthenticatedGmailClient>>;
  try {
    gmail = await getAuthenticatedGmailClient();
  } catch {
    return res.status(400).json({ error: 'Gmail not connected' });
  }

  const trackingPixelId = randomUUID();
  const publicUrl = (process.env.PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  const pixelTag = `<img src="${publicUrl}/api/track/${trackingPixelId}" width="1" height="1" alt="" style="display:none">`;
  const htmlBody = body.replace(/\n/g, '<br>') + pixelTag;

  const raw = [
    `To: ${to}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    `Subject: ${subject}`,
    '',
    htmlBody,
  ].join('\r\n');

  const encoded = Buffer.from(raw).toString('base64url');

  try {
    const sent = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    const result = await pool.query(
      `INSERT INTO interactions
         (contact_id, deal_id, type, summary, occurred_at,
          gmail_message_id, email_subject, email_to, direction, source, tracking_pixel_id)
       VALUES ($1, $2, 'email', $3, NOW(), $4, $5, $6, 'sent', 'gmail_sent', $7)
       RETURNING *`,
      [
        contact_id,
        deal_id || null,
        `Email: ${subject}`,
        sent.data.id ?? null,
        subject,
        to,
        trackingPixelId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to send email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Templates

router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM email_templates ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req: Request, res: Response) => {
  const { name, subject, body } = req.body;
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'name, subject, and body are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO email_templates (name, subject, body) VALUES ($1, $2, $3) RETURNING *',
      [name, subject, body]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.put('/templates/:id', async (req: Request, res: Response) => {
  const { name, subject, body } = req.body;
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'name, subject, and body are required' });
  }
  try {
    const result = await pool.query(
      'UPDATE email_templates SET name=$1, subject=$2, body=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, subject, body, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM email_templates WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
