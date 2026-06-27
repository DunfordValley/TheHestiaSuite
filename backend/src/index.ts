import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';
import contactsRouter from './routes/contacts';
import dealsRouter from './routes/deals';
import interactionsRouter from './routes/interactions';
import gmailRouter from './routes/gmail';
import emailRouter from './routes/email';
import trackingRouter from './routes/tracking';
import { startSyncPoller } from './services/emailSync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/contacts', contactsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/gmail', gmailRouter);
app.use('/api/email', emailRouter);
app.use('/api/track', trackingRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hestia-suite-api' });
});

async function start() {
  try {
    console.log('Running database migrations...');
    await runMigrations();
    console.log('Migrations complete.');

    startSyncPoller();

    app.listen(PORT, () => {
      console.log(`The Hestia Suite API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
