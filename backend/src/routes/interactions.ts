import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contact_id as string | undefined;
    const limit = parseInt(req.query.limit as string || '50', 10);

    let query = `
      SELECT i.*, c.name as contact_name, d.title as deal_title
      FROM interactions i
      LEFT JOIN contacts c ON i.contact_id = c.id
      LEFT JOIN deals d ON i.deal_id = d.id
    `;
    const params: (string | number)[] = [];

    if (contactId) {
      query += ' WHERE i.contact_id = $1';
      params.push(contactId);
    }

    query += ` ORDER BY i.occurred_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { contact_id, deal_id, type, summary, occurred_at } = req.body;

    if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });
    if (!type) return res.status(400).json({ error: 'type is required' });
    if (!summary) return res.status(400).json({ error: 'summary is required' });

    const validTypes = ['call', 'email', 'note', 'meeting'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO interactions (contact_id, deal_id, type, summary, occurred_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [contact_id, deal_id || null, type, summary, occurred_at || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create interaction' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM interactions WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Interaction not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete interaction' });
  }
});

export default router;
