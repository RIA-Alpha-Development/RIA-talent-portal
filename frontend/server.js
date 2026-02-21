/**
 * RIA Talent Portal - Unified Express Server
 *
 * Handles:
 * - Static file serving (React build)
 * - Database API endpoints (PostgreSQL)
 * - JWT authentication
 * - Vertex AI proxy for Gemini features
 * - Health check for Cloud Run
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Initialize Google Generative AI client
let genAI = null;
if (GOOGLE_API_KEY) {
  genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  console.log('[AI] Google Generative AI initialized with API key');
} else {
  console.warn('[AI] GOOGLE_API_KEY not set - AI features will be limited');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: process.env.API_PAYLOAD_MAX_SIZE || '7mb' }));
app.set('trust proxy', 1);

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ria_ats',
  host: process.env.INSTANCE_CONNECTION_NAME
    ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
    : (process.env.DB_HOST || 'localhost'),
};

const pool = new Pool(dbConfig);

// Test database connection on startup (non-blocking)
pool.query('SELECT NOW()')
  .then(res => console.log('Database connected at:', res.rows[0].now))
  .catch(err => console.error('Database connection error:', err.message));

// ============================================================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional auth - allows unauthenticated access but attaches user if token present
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// ============================================================================
// RATE LIMITING
// ============================================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const proxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later.' },
});

// ============================================================================
// HEALTH CHECK ENDPOINT (for Cloud Run)
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, status, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.status !== 'Active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!validPassword) {
      // Fallback: check if password matches plaintext (for migration)
      if (password !== user.password_hash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Refresh token
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  const token = jwt.sign(
    {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  res.json({ token });
});

// ============================================================================
// JOBS API ENDPOINTS
// ============================================================================

// Get all jobs
app.get('/api/jobs', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
    // Transform snake_case to camelCase for frontend
    const jobs = result.rows.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryUnit: job.salary_unit,
      type: job.type,
      mode: job.mode,
      status: job.status,
      createdAt: job.created_at,
      referenceFileName: job.reference_file_name,
    }));
    res.json(jobs);
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Create job
app.post('/api/jobs', apiLimiter, authenticateToken, async (req, res) => {
  const { id, title, description, salaryMin, salaryMax, salaryUnit, type, mode, status, createdAt, referenceFileName } = req.body;
  try {
    await pool.query(
      'INSERT INTO jobs (id, title, description, salary_min, salary_max, salary_unit, type, mode, status, created_at, reference_file_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [id, title, description, salaryMin, salaryMax, salaryUnit, type, mode, status, createdAt, referenceFileName]
    );
    res.status(201).json(req.body);
  } catch (err) {
    console.error('POST /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
app.put('/api/jobs/:id', apiLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, salaryMin, salaryMax, salaryUnit, type, mode, status, referenceFileName } = req.body;
  try {
    await pool.query(
      'UPDATE jobs SET title = $1, description = $2, salary_min = $3, salary_max = $4, salary_unit = $5, type = $6, mode = $7, status = $8, reference_file_name = $9 WHERE id = $10',
      [title, description, salaryMin, salaryMax, salaryUnit, type, mode, status, referenceFileName, id]
    );
    res.json(req.body);
  } catch (err) {
    console.error('PUT /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
app.delete('/api/jobs/:id', apiLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('DELETE /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ============================================================================
// CANDIDATES API ENDPOINTS
// ============================================================================

// Get all candidates
app.get('/api/candidates', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates ORDER BY applied_at DESC');
    const candidates = result.rows.map(c => ({
      id: c.id,
      jobId: c.job_id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      summary: c.summary,
      skills: typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills,
      currentStage: c.current_stage,
      history: typeof c.history === 'string' ? JSON.parse(c.history) : c.history,
      appliedAt: c.applied_at,
      matchScore: c.match_score,
      assignedInterviewerIds: typeof c.assigned_interviewer_ids === 'string' ? JSON.parse(c.assigned_interviewer_ids) : c.assigned_interviewer_ids,
      scheduledInterview: typeof c.scheduled_interview === 'string' ? JSON.parse(c.scheduled_interview) : c.scheduled_interview,
      resumeUrl: c.resume_url,
      resumeFileName: c.resume_file_name,
      referredBy: c.referred_by,
    }));
    res.json(candidates);
  } catch (err) {
    console.error('GET /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Create candidate
app.post('/api/candidates', apiLimiter, optionalAuth, async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `INSERT INTO candidates (id, job_id, name, email, phone, address, summary, skills, current_stage, history, applied_at, match_score, assigned_interviewer_ids, resume_url, resume_file_name, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        c.id, c.jobId, c.name, c.email, c.phone, c.address, c.summary,
        JSON.stringify(c.skills || []), c.currentStage, JSON.stringify(c.history || []),
        c.appliedAt, c.matchScore, JSON.stringify(c.assignedInterviewerIds || []),
        c.resumeUrl, c.resumeFileName, c.referredBy
      ]
    );
    res.status(201).json(c);
  } catch (err) {
    console.error('POST /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// Update candidate
app.put('/api/candidates/:id', apiLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  try {
    await pool.query(
      `UPDATE candidates SET
        current_stage = $1, history = $2, assigned_interviewer_ids = $3,
        scheduled_interview = $4, match_score = $5, name = $6, email = $7,
        phone = $8, address = $9, summary = $10, skills = $11
       WHERE id = $12`,
      [
        c.currentStage, JSON.stringify(c.history || []),
        JSON.stringify(c.assignedInterviewerIds || []),
        JSON.stringify(c.scheduledInterview), c.matchScore,
        c.name, c.email, c.phone, c.address, c.summary,
        JSON.stringify(c.skills || []), id
      ]
    );
    res.json(c);
  } catch (err) {
    console.error('PUT /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Delete candidate
app.delete('/api/candidates/:id', apiLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM candidates WHERE id = $1', [id]);
    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    console.error('DELETE /api/candidates error:', err);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// ============================================================================
// USERS API ENDPOINTS
// ============================================================================

// Get all users
app.get('/api/users', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
app.post('/api/users', apiLimiter, authenticateToken, async (req, res) => {
  const { id, name, email, role, status, password } = req.body;

  // Only admins can create users
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (id, name, email, role, status, password_hash) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, email.toLowerCase(), role, status, passwordHash]
    );
    res.status(201).json({ id, name, email, role, status });
  } catch (err) {
    console.error('POST /api/users error:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', apiLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, password } = req.body;

  // Only admins can update other users
  if (req.user.role !== 'ADMIN' && req.user.userId !== id) {
    return res.status(403).json({ error: 'Not authorized to update this user' });
  }

  try {
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, status = $4, password_hash = $5 WHERE id = $6',
        [name, email.toLowerCase(), role, status, passwordHash, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5',
        [name, email.toLowerCase(), role, status, id]
      );
    }
    res.json({ id, name, email, role, status });
  } catch (err) {
    console.error('PUT /api/users error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', apiLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Only admins can delete users
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can delete users' });
  }

  // Prevent self-deletion
  if (req.user.userId === id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /api/users error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================================================
// VERTEX AI PROXY (for Gemini features)
// ============================================================================

// Uses Google Application Default Credentials (ADC)
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePattern(pattern) {
  const paramRegex = /\{\{(.*?)\}\}/g;
  const params = [];
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = paramRegex.exec(pattern)) !== null) {
    params.push(match[1]);
    const literalPart = pattern.substring(lastIndex, match.index);
    parts.push(escapeRegex(literalPart));
    parts.push(`(?<${match[1]}>[^/]+)`);
    lastIndex = paramRegex.lastIndex;
  }
  parts.push(escapeRegex(pattern.substring(lastIndex)));
  const regexString = parts.join('');

  return { regex: new RegExp(`^${regexString}$`), params };
}

function extractParams(patternInfo, url) {
  const match = url.match(patternInfo.regex);
  if (!match) return null;
  const params = {};
  patternInfo.params.forEach((paramName, index) => {
    params[paramName] = match[index + 1];
  });
  return params;
}

const API_CLIENT_MAP = [
  {
    name: 'VertexGenAi:generateContent',
    patternForProxy: 'https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:generateContent',
    getApiEndpoint: (context, params) => {
      return `https://aiplatform.clients6.google.com/${params['version']}/projects/${context.projectId}/locations/${context.region}/publishers/google/models/${params['model']}:generateContent`;
    },
    isStreaming: false,
    transformFn: null,
  },
  {
    name: 'VertexGenAi:predict',
    patternForProxy: 'https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:predict',
    getApiEndpoint: (context, params) => {
      return `https://aiplatform.clients6.google.com/${params['version']}/projects/${context.projectId}/locations/${context.region}/publishers/google/models/${params['model']}:predict`;
    },
    isStreaming: false,
    transformFn: null,
  },
  {
    name: 'VertexGenAi:streamGenerateContent',
    patternForProxy: 'https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:streamGenerateContent',
    getApiEndpoint: (context, params) => {
      return `https://aiplatform.clients6.google.com/${params['version']}/projects/${context.projectId}/locations/${context.region}/publishers/google/models/${params['model']}:streamGenerateContent`;
    },
    isStreaming: true,
    transformFn: (response) => {
      let normalizedResponse = response.trim();
      while (normalizedResponse.startsWith(',') || normalizedResponse.startsWith('[')) {
        normalizedResponse = normalizedResponse.substring(1).trim();
      }
      while (normalizedResponse.endsWith(',') || normalizedResponse.endsWith(']')) {
        normalizedResponse = normalizedResponse.substring(0, normalizedResponse.length - 1).trim();
      }

      if (!normalizedResponse.length) {
        return { result: null, inProgress: false };
      }

      if (!normalizedResponse.endsWith('}')) {
        return { result: normalizedResponse, inProgress: true };
      }

      try {
        const parsedResponse = JSON.parse(`${normalizedResponse}`);
        const transformedResponse = `data: ${JSON.stringify(parsedResponse)}\n\n`;
        return { result: transformedResponse, inProgress: false };
      } catch (error) {
        throw new Error(`Failed to parse response: ${error}.`);
      }
    },
  },
  {
    name: 'ReasoningEngine:query',
    patternForProxy: 'https://{{endpoint_location}}-aiplatform.googleapis.com/{{version}}/projects/{{project_id}}/locations/{{location_id}}/reasoningEngines/{{engine_id}}:query',
    getApiEndpoint: (context, params) => {
      return `https://${params['endpoint_location']}-aiplatform.clients6.google.com/v1beta1/projects/${params['project_id']}/locations/${params['location_id']}/reasoningEngines/${params['engine_id']}:query`;
    },
    isStreaming: false,
    transformFn: null,
  },
  {
    name: 'ReasoningEngine:streamQuery',
    patternForProxy: 'https://{{endpoint_location}}-aiplatform.googleapis.com/{{version}}/projects/{{project_id}}/locations/{{location_id}}/reasoningEngines/{{engine_id}}:streamQuery',
    getApiEndpoint: (context, params) => {
      return `https://${params['endpoint_location']}-aiplatform.clients6.google.com/v1beta1/projects/${params['project_id']}/locations/${params['location_id']}/reasoningEngines/${params['engine_id']}:streamQuery`;
    },
    isStreaming: true,
    transformFn: null,
  },
].map((client) => ({ ...client, patternInfo: parsePattern(client.patternForProxy) }));

async function getAccessToken(res) {
  try {
    const authClient = await auth.getClient();
    const token = await authClient.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('[Proxy] Authentication error:', error);
    if (!res) return null;
    if (error.code === 'ERR_GCLOUD_NOT_LOGGED_IN' || (error.message && error.message.includes('Could not load the default credentials'))) {
      res.status(401).json({
        error: 'Authentication Required',
        message: 'Google Cloud credentials not found. Please configure ADC.',
      });
    } else {
      res.status(500).json({ error: `Authentication failed: ${error.message}` });
    }
    return null;
  }
}

function getRequestHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'X-Goog-User-Project': GOOGLE_CLOUD_PROJECT,
    'Content-Type': 'application/json',
  };
}

// Vertex AI Proxy Endpoint
app.post('/api-proxy', proxyLimiter, async (req, res) => {
  // Check for the custom header added by the frontend shim
  if (req.headers['x-app-proxy'] !== 'local-vertex-ai-app') {
    return res.status(403).send('Forbidden: Request must originate from the app.');
  }

  if (!GOOGLE_CLOUD_PROJECT) {
    return res.status(500).json({ error: 'GOOGLE_CLOUD_PROJECT not configured' });
  }

  const { originalUrl, method, headers, body } = req.body;
  if (!originalUrl) {
    return res.status(400).send('Bad Request: originalUrl is required.');
  }

  // Find matching API client
  let extractedParams = null;
  const apiClient = API_CLIENT_MAP.find(p => {
    extractedParams = extractParams(p.patternInfo, originalUrl);
    return extractedParams !== null;
  });

  if (!apiClient) {
    console.error(`[Proxy] No handler found for URL: ${originalUrl}`);
    return res.status(404).json({ error: `No proxy handler found for URL: ${originalUrl}` });
  }

  console.log(`[Proxy] Matched: ${apiClient.name}`);

  try {
    const accessToken = await getAccessToken(res);
    if (!accessToken) return;

    const context = { projectId: GOOGLE_CLOUD_PROJECT, region: GOOGLE_CLOUD_LOCATION };
    const apiUrl = apiClient.getApiEndpoint(context, extractedParams);
    console.log(`[Proxy] Forwarding to: ${apiUrl}`);

    const apiHeaders = getRequestHeaders(accessToken);

    const apiFetchOptions = {
      method: method || 'POST',
      headers: { ...apiHeaders, ...headers },
      body: body ? body : undefined,
    };

    const apiResponse = await fetch(apiUrl, apiFetchOptions);

    if (apiClient.isStreaming) {
      res.writeHead(apiResponse.status, {
        'Content-Type': 'text/event-stream',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
      });
      res.flushHeaders();

      if (!apiResponse.body) {
        return res.end(JSON.stringify({ error: 'Streaming response body is null' }));
      }

      const decoder = new TextDecoder();
      let deltaChunk = '';

      apiResponse.body.on('data', (encodedChunk) => {
        if (res.writableEnded) return;

        try {
          if (!apiClient.transformFn) {
            res.write(encodedChunk);
          } else {
            const decodedChunk = decoder.decode(encodedChunk, { stream: true });
            deltaChunk = deltaChunk + decodedChunk;

            const { result, inProgress } = apiClient.transformFn(deltaChunk);
            if (result && !inProgress) {
              deltaChunk = '';
              res.write(new TextEncoder().encode(result));
            }
          }
        } catch (error) {
          console.error(`[Proxy] Error processing stream:`, error);
        }
      });

      apiResponse.body.on('end', () => {
        deltaChunk = '';
        res.end();
      });

      apiResponse.body.on('error', (streamError) => {
        console.error('[Proxy] Stream error:', streamError);
        if (!res.writableEnded) {
          res.end(JSON.stringify({ proxyError: 'Stream error', details: streamError.message }));
        }
      });

      res.on('error', (resError) => {
        console.error('[Proxy] Response error:', resError);
        if (apiResponse.body && typeof apiResponse.body.destroy === 'function') {
          apiResponse.body.destroy(resError);
        }
      });
    } else {
      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    }
  } catch (error) {
    console.error(`[Proxy] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI EXTRACTION ENDPOINTS (Server-side Gemini API calls)
// ============================================================================

// Helper function to call Gemini AI via Google Generative AI SDK
async function callGeminiAI(prompt, modelName = 'gemini-1.5-flash-latest') {
  if (!genAI) {
    throw new Error('Google Generative AI not initialized - GOOGLE_API_KEY not set');
  }

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text || '';
  } catch (err) {
    console.error('[AI] Gemini API error:', err.message);
    throw new Error(`Gemini API error: ${err.message}`);
  }
}

// Helper to extract JSON from AI response
function extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error('Could not parse JSON from response');
}

// POST /api/ai/extract-candidate - Extract candidate details from resume text
app.post('/api/ai/extract-candidate', proxyLimiter, async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'resumeText is required' });

  try {
    const prompt = `You are an expert HR assistant. Extract candidate information from the following resume text into a JSON object with these fields: name, email, phone, address, summary (brief professional summary), skills (array of strings).

Resume Text:
"""
${resumeText}
"""

Return only the JSON object, no additional text.`;

    const response = await callGeminiAI(prompt);
    const extracted = extractJSON(response);
    res.json(extracted);
  } catch (err) {
    console.error('POST /api/ai/extract-candidate error:', err);
    res.status(500).json({ error: 'Failed to extract candidate details', details: err.message });
  }
});

// POST /api/ai/extract-job - Extract job details from document text
app.post('/api/ai/extract-job', proxyLimiter, authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const prompt = `Extract job details from the following text and return as JSON with fields: title, salaryMin (number), salaryMax (number), salaryUnit (Annually or Per Hour), type (Full-time, Part-time, Contract, Contract-to-hire, or Intern), mode (Remote, Hybrid, or On-site), description. Text: ${text}

Return only the JSON object, no additional text.`;
    const response = await callGeminiAI(prompt);
    res.json(extractJSON(response));
  } catch (err) {
    console.error('POST /api/ai/extract-job error:', err);
    res.status(500).json({ error: 'Failed to extract job details', details: err.message });
  }
});

// POST /api/ai/generate-job-description - Generate job description from prompt
app.post('/api/ai/generate-job-description', proxyLimiter, authenticateToken, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const aiPrompt = `Generate a professional job description based on this input: ${prompt}. Include sections for Responsibilities, Requirements, and Benefits. Format it nicely with headers and bullet points.`;
    const description = await callGeminiAI(aiPrompt);
    res.json({ description });
  } catch (err) {
    console.error('POST /api/ai/generate-job-description error:', err);
    res.status(500).json({ error: 'Failed to generate job description', details: err.message });
  }
});

// POST /api/ai/calculate-match - Calculate match score between resume and job
app.post('/api/ai/calculate-match', proxyLimiter, async (req, res) => {
  const { resumeText, jobDescription } = req.body;
  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: 'resumeText and jobDescription are required' });
  }

  try {
    const prompt = `You are an expert recruiter. Compare the candidate resume to the job description.
Assign a suitability score from 0 to 100, where 100 is a perfect match.

Job Description:
"""
${jobDescription}
"""

Candidate Resume:
"""
${resumeText}
"""

Return only a JSON object with a "score" field containing the numeric score, e.g. {"score": 75}`;

    const response = await callGeminiAI(prompt);
    const result = extractJSON(response);
    res.json({ score: result.score || 0 });
  } catch (err) {
    console.error('POST /api/ai/calculate-match error:', err);
    res.json({ score: 0 }); // Return 0 on error, don't fail the whole request
  }
});

// POST /api/ai/summarize-notes - Summarize interview transcript/notes
app.post('/api/ai/summarize-notes', proxyLimiter, authenticateToken, async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });

  try {
    const prompt = `You are an expert recruiter. Below is a transcript or raw notes from an interview.
Please provide a concise, professional summary of the interview.
Focus on:
1. Key strengths mentioned
2. Potential concerns or red flags
3. Overall recommendation

Transcript:
"""
${transcript}
"""`;

    const summary = await callGeminiAI(prompt);
    res.json({ summary });
  } catch (err) {
    console.error('POST /api/ai/summarize-notes error:', err);
    res.status(500).json({ error: 'Failed to summarize notes', details: err.message });
  }
});

// ============================================================================
// STATIC FILE SERVING
// ============================================================================

// Serve static files from the dist directory (production build)
const staticDir = isProduction ? path.join(__dirname, 'dist') : __dirname;
app.use(express.static(staticDir));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = isProduction
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`RIA Talent Portal running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
