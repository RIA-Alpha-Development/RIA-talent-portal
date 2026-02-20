
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(__dirname));

// Cloud SQL Connection Configuration
// Cloud Run provides the connection via a Unix socket at /cloudsql/
const isProduction = process.env.NODE_ENV === 'production';

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ria_ats',
  // If running in Cloud Run, use the Unix socket. Otherwise, use host (for local testing with proxy)
  host: process.env.INSTANCE_CONNECTION_NAME 
    ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` 
    : (process.env.DB_HOST || 'localhost'),
};

const pool = new Pool(dbConfig);

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// --- API Endpoints ---

// Jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs from database' });
  }
});

app.post('/api/jobs', async (req, res) => {
  const { id, title, description, salaryMin, salaryMax, salaryUnit, type, mode, status, createdAt, referenceFileName } = req.body;
  try {
    await pool.query(
      'INSERT INTO jobs (id, title, description, salary_min, salary_max, salary_unit, type, mode, status, created_at, reference_file_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [id, title, description, salaryMin, salaryMax, salaryUnit, type, mode, status, createdAt, referenceFileName]
    );
    res.status(201).json(req.body);
  } catch (err) {
    console.error('POST /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to save job' });
  }
});

// Candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates ORDER BY applied_at DESC');
    // Parse JSON strings back to objects for the frontend
    const candidates = result.rows.map(c => ({
      ...c,
      skills: typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills,
      history: typeof c.history === 'string' ? JSON.parse(c.history) : c.history,
      assigned_interviewer_ids: typeof c.assigned_interviewer_ids === 'string' ? JSON.parse(c.assigned_interviewer_ids) : c.assigned_interviewer_ids,
      scheduled_interview: typeof c.scheduled_interview === 'string' ? JSON.parse(c.scheduled_interview) : c.scheduled_interview
    }));
    res.json(candidates);
  } catch (err) {
    console.error('GET /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

app.post('/api/candidates', async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      'INSERT INTO candidates (id, job_id, name, email, phone, address, summary, skills, current_stage, history, applied_at, match_score, assigned_interviewer_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [c.id, c.jobId, c.name, c.email, c.phone, c.address, c.summary, JSON.stringify(c.skills), c.currentStage, JSON.stringify(c.history), c.appliedAt, c.matchScore, JSON.stringify(c.assignedInterviewerIds)]
    );
    res.status(201).json(c);
  } catch (err) {
    console.error('POST /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to save candidate' });
  }
});

app.put('/api/candidates/:id', async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  try {
    await pool.query(
      'UPDATE candidates SET current_stage = $1, history = $2, assigned_interviewer_ids = $3, scheduled_interview = $4 WHERE id = $5',
      [c.currentStage, JSON.stringify(c.history), JSON.stringify(c.assignedInterviewerIds), JSON.stringify(c.scheduledInterview), id]
    );
    res.json(c);
  } catch (err) {
    console.error('PUT /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RIA Talent Portal running on port ${PORT}`);
});
