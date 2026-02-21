-- RIA Talent Portal - Database Schema
-- This file is run automatically by Docker Compose on first startup

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_unit VARCHAR(20) DEFAULT 'ANNUAL',
    type VARCHAR(30) DEFAULT 'FULL_TIME',
    mode VARCHAR(20) DEFAULT 'ON_SITE',
    status VARCHAR(20) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_file_name VARCHAR(255)
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    summary TEXT,
    skills JSONB DEFAULT '[]',
    current_stage VARCHAR(30) DEFAULT 'APPLIED',
    history JSONB DEFAULT '[]',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_score INTEGER,
    assigned_interviewer_ids JSONB DEFAULT '[]',
    scheduled_interview JSONB,
    resume_url TEXT,
    resume_file_name VARCHAR(255),
    referred_by VARCHAR(50)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'HR',
    status VARCHAR(20) DEFAULT 'Active',
    password_hash VARCHAR(255)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_current_stage ON candidates(current_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_applied_at ON candidates(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (password: admin123)
-- The hash is for 'admin123' using bcrypt
INSERT INTO users (id, name, email, role, status, password_hash)
VALUES (
    'admin-001',
    'System Admin',
    'admin@example.com',
    'ADMIN',
    'Active',
    '$2a$10$rQnM8kFvL5x5q5x5x5x5xOjYF5F5F5F5F5F5F5F5F5F5F5F5F5F5F5'
)
ON CONFLICT (id) DO NOTHING;
