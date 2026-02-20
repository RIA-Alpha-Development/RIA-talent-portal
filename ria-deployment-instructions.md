# RIA Talent Portal - Deployment Instructions for AI Assistant

## Context
This document contains the necessary steps to deploy the RIA Talent Portal (React + Node.js + Cloud SQL) to Google Cloud Run. 

## Pre-Deployment Checklist
- [ ] Enable Cloud Run API
- [ ] Enable Cloud Build API
- [ ] Enable Secret Manager API
- [ ] Grant Cloud Run Service Account 'Cloud SQL Client' role

## Deployment Commands

### 1. Create Database
```bash
gcloud sql databases create ria_ats --instance=[YOUR_INSTANCE_NAME]
```

### 2. Store Secrets
```bash
echo -n "[YOUR_GEMINI_API_KEY]" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "[YOUR_DB_PASSWORD]" | gcloud secrets create DB_PASSWORD --data-file=-
```

### 3. Build Container
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/ria-ats .
```

### 4. Deploy to Cloud Run
```bash
gcloud run deploy ria-ats \
  --image gcr.io/[PROJECT_ID]/ria-ats \
  --add-cloudsql-instances [INSTANCE_CONNECTION_NAME] \
  --update-env-vars DB_NAME=ria_ats,DB_USER=postgres,INSTANCE_CONNECTION_NAME=[INSTANCE_CONNECTION_NAME] \
  --update-secrets DB_PASSWORD=DB_PASSWORD:latest,API_KEY=GEMINI_API_KEY:latest
```

## Database Schema (PostgreSQL)
Run the following SQL in your Cloud SQL instance:

```sql
CREATE TABLE jobs (
  id VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_unit VARCHAR(20),
  type VARCHAR(50),
  mode VARCHAR(50),
  status VARCHAR(20),
  created_at TIMESTAMP,
  reference_file_name TEXT
);

CREATE TABLE candidates (
  id VARCHAR(50) PRIMARY KEY,
  job_id VARCHAR(50) REFERENCES jobs(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  summary TEXT,
  skills JSONB,
  current_stage VARCHAR(50),
  history JSONB,
  applied_at TIMESTAMP,
  match_score INTEGER,
  assigned_interviewer_ids JSONB,
  scheduled_interview JSONB
);

CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role VARCHAR(20),
  status VARCHAR(20),
  password TEXT
);

-- Insert Default Admin
INSERT INTO users (id, name, email, role, status, password) 
VALUES ('u-1', 'Admin User', 'admin@ria.com', 'ADMIN', 'Active', 'Riafinance123');
```

## Environment Variables Required
- DB_USER
- DB_NAME
- INSTANCE_CONNECTION_NAME
- API_KEY (Gemini API)
- DB_PASSWORD (via Secret Manager)
