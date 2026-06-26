-- The Hestia Suite CRM - Initial Schema

CREATE TABLE IF NOT EXISTS contacts (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  title      TEXT,
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  stage      TEXT NOT NULL DEFAULT 'Lead',
  value      NUMERIC(12,2),
  close_date DATE,
  notes      TEXT,
  position   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interactions (
  id          SERIAL PRIMARY KEY,
  contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id     INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  summary     TEXT NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed demo data (idempotent via conditional insert)
INSERT INTO contacts (name, email, phone, company, title, tags)
SELECT 'Alice Johnson', 'alice@acmecorp.com', '555-0101', 'Acme Corp', 'VP Sales', ARRAY['enterprise', 'warm']
WHERE NOT EXISTS (SELECT 1 FROM contacts LIMIT 1);

INSERT INTO contacts (name, email, phone, company, title, tags)
SELECT 'Bob Martinez', 'bob@techflow.io', '555-0102', 'TechFlow', 'CTO', ARRAY['tech', 'hot']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'bob@techflow.io');

INSERT INTO contacts (name, email, phone, company, title, tags)
SELECT 'Carol White', 'carol@retailco.com', '555-0103', 'RetailCo', 'Buyer', ARRAY['retail']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'carol@retailco.com');

INSERT INTO contacts (name, email, phone, company, title, tags)
SELECT 'David Kim', 'david@startupxyz.com', '555-0104', 'StartupXYZ', 'CEO', ARRAY['startup', 'warm']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'david@startupxyz.com');

INSERT INTO deals (title, contact_id, stage, value, close_date)
SELECT 'Acme Corp Enterprise Deal', (SELECT id FROM contacts WHERE email='alice@acmecorp.com'), 'Proposal', 45000, '2026-08-01'
WHERE NOT EXISTS (SELECT 1 FROM deals LIMIT 1);

INSERT INTO deals (title, contact_id, stage, value, close_date)
SELECT 'TechFlow Platform License', (SELECT id FROM contacts WHERE email='bob@techflow.io'), 'Negotiation', 22000, '2026-07-15'
WHERE NOT EXISTS (SELECT 1 FROM deals WHERE title='TechFlow Platform License');

INSERT INTO deals (title, contact_id, stage, value, close_date)
SELECT 'RetailCo Starter Pack', (SELECT id FROM contacts WHERE email='carol@retailco.com'), 'Lead', 5000, '2026-09-01'
WHERE NOT EXISTS (SELECT 1 FROM deals WHERE title='RetailCo Starter Pack');

INSERT INTO deals (title, contact_id, stage, value, close_date)
SELECT 'StartupXYZ Growth Plan', (SELECT id FROM contacts WHERE email='david@startupxyz.com'), 'Qualified', 12000, '2026-08-15'
WHERE NOT EXISTS (SELECT 1 FROM deals WHERE title='StartupXYZ Growth Plan');

INSERT INTO interactions (contact_id, deal_id, type, summary, occurred_at)
SELECT
  (SELECT id FROM contacts WHERE email='alice@acmecorp.com'),
  (SELECT id FROM deals WHERE title='Acme Corp Enterprise Deal'),
  'call',
  'Initial discovery call — very interested in enterprise tier. Follow up next week.',
  NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM interactions LIMIT 1);

INSERT INTO interactions (contact_id, deal_id, type, summary, occurred_at)
SELECT
  (SELECT id FROM contacts WHERE email='alice@acmecorp.com'),
  (SELECT id FROM deals WHERE title='Acme Corp Enterprise Deal'),
  'email',
  'Sent proposal document and pricing sheet.',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE type='email' AND contact_id=(SELECT id FROM contacts WHERE email='alice@acmecorp.com'));

INSERT INTO interactions (contact_id, deal_id, type, summary, occurred_at)
SELECT
  (SELECT id FROM contacts WHERE email='bob@techflow.io'),
  (SELECT id FROM deals WHERE title='TechFlow Platform License'),
  'meeting',
  'Demo session — liked the API features. Requested custom SLA.',
  NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE contact_id=(SELECT id FROM contacts WHERE email='bob@techflow.io'));

INSERT INTO interactions (contact_id, deal_id, type, summary, occurred_at)
SELECT
  (SELECT id FROM contacts WHERE email='carol@retailco.com'),
  (SELECT id FROM deals WHERE title='RetailCo Starter Pack'),
  'note',
  'Referred by Bob Martinez. Needs starter package, budget ~$5k.',
  NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE contact_id=(SELECT id FROM contacts WHERE email='carol@retailco.com'));

INSERT INTO interactions (contact_id, deal_id, type, summary, occurred_at)
SELECT
  (SELECT id FROM contacts WHERE email='david@startupxyz.com'),
  (SELECT id FROM deals WHERE title='StartupXYZ Growth Plan'),
  'call',
  'Qualified lead — expanding team rapidly, needs CRM in 30 days.',
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE contact_id=(SELECT id FROM contacts WHERE email='david@startupxyz.com'));
