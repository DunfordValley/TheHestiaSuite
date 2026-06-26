import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contact_id as string | undefined;
    let query = `
      SELECT d.*, c.name as contact_name, c.company as contact_company
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
    `;
    const params: string[] = [];

    if (contactId) {
      query += ' WHERE d.contact_id = $1';
      params.push(contactId);
    }

    query += ' ORDER BY d.stage, d.position, d.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE stage NOT IN ('Closed Won','Closed Lost')) AS open_deals,
        COUNT(*) FILTER (WHERE stage = 'Closed Won') AS won_deals,
        COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('Closed Won','Closed Lost')), 0) AS pipeline_value,
        COALESCE(SUM(value) FILTER (WHERE stage = 'Closed Won'), 0) AS won_value
      FROM deals
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, c.name as contact_name FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, contact_id, stage, value, close_date, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const maxPos = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM deals WHERE stage = $1',
      [stage || 'Lead']
    );

    const result = await pool.query(
      `INSERT INTO deals (title, contact_id, stage, value, close_date, notes, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        title,
        contact_id || null,
        stage || 'Lead',
        value || null,
        close_date || null,
        notes || null,
        maxPos.rows[0].next_pos,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, contact_id, stage, value, close_date, notes, position } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await pool.query(
      `UPDATE deals SET title=$1, contact_id=$2, stage=$3, value=$4, close_date=$5, notes=$6, position=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, contact_id || null, stage, value || null, close_date || null, notes || null, position ?? 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

router.patch('/:id/stage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage, position } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const result = await pool.query(
      'UPDATE deals SET stage=$1, position=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [stage, position ?? 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM deals WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

export default router;
