import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

router.get('/:pixelId', (req: Request, res: Response) => {
  const { pixelId } = req.params;

  pool.query(
    `UPDATE interactions
     SET open_count = open_count + 1,
         opened_at  = COALESCE(opened_at, NOW())
     WHERE tracking_pixel_id = $1`,
    [pixelId]
  ).catch(err => console.error('Tracking update error:', err));

  res.set({
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });
  res.send(PIXEL);
});

export default router;
