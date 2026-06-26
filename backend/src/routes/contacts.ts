import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    let query = 'SELECT * FROM contacts';
    const params: string[] = [];

    if (search) {
      query += ` WHERE name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contact = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (contact.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });

    const deals = await pool.query(
      'SELECT * FROM deals WHERE contact_id = $1 ORDER BY created_at DESC',
      [id]
    );
    const interactions = await pool.query(
      'SELECT i.*, d.title as deal_title FROM interactions i LEFT JOIN deals d ON i.deal_id = d.id WHERE i.contact_id = $1 ORDER BY i.occurred_at DESC',
      [id]
    );

    res.json({
      ...contact.rows[0],
      deals: deals.rows,
      interactions: interactions.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, title, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await pool.query(
      `INSERT INTO contacts (name, email, phone, company, title, tags)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email || null, phone || null, company || null, title || null, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, title, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await pool.query(
      `UPDATE contacts SET name=$1, email=$2, phone=$3, company=$4, title=$5, tags=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, email || null, phone || null, company || null, title || null, tags || [], id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
