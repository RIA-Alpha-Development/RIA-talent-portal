
import React from 'react';
import { Cloud, Terminal, Database, Globe, ShieldCheck, Copy, Check, Server, ListChecks, Key, Download, FileCode } from 'lucide-react';

const DeploymentGuide: React.FC = () => {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      title: "1. Create Cloud SQL Database",
      desc: "Since you already have Cloud SQL, create a new database named 'ria_ats' and run the schema provided below.",
      cmd: "gcloud sql databases create ria_ats --instance=[YOUR_INSTANCE_NAME]"
    },
    {
      title: "2. Store Secrets",
      desc: "Store your Gemini API Key and DB Password in Secret Manager for security.",
      cmd: "echo -n \"[YOUR_KEY]\" | gcloud secrets create GEMINI_API_KEY --data-file=-\necho -n \"[DB_PASSWORD]\" | gcloud secrets create DB_PASSWORD --data-file=-"
    },
    {
      title: "3. Build Image",
      desc: "Use Cloud Build to create your container image.",
      cmd: "gcloud builds submit --tag gcr.io/[PROJECT_ID]/ria-ats ."
    },
    {
      title: "4. Deploy to Cloud Run",
      desc: "Deploy the service, linking the Cloud SQL instance and environment variables.",
      cmd: "gcloud run deploy ria-ats --image gcr.io/[PROJECT_ID]/ria-ats --add-cloudsql-instances [INSTANCE_CONNECTION_NAME] --update-env-vars DB_NAME=ria_ats,DB_USER=postgres,INSTANCE_CONNECTION_NAME=[INSTANCE_CONNECTION_NAME] --update-secrets DB_PASSWORD=DB_PASSWORD:latest,API_KEY=GEMINI_API_KEY:latest"
    }
  ];

  const downloadMarkdown = () => {
    const markdown = `# RIA Talent Portal - Deployment Instructions for AI Assistant

## Context
This document contains the necessary steps to deploy the RIA Talent Portal (React + Node.js + Cloud SQL) to Google Cloud Run. 

## Pre-Deployment Checklist
- [ ] Enable Cloud Run API
- [ ] Enable Cloud Build API
- [ ] Enable Secret Manager API
- [ ] Grant Cloud Run Service Account 'Cloud SQL Client' role

## Deployment Commands

### 1. Create Database
\`\`\`bash
gcloud sql databases create ria_ats --instance=[YOUR_INSTANCE_NAME]
\`\`\`

### 2. Store Secrets
\`\`\`bash
echo -n "[YOUR_GEMINI_API_KEY]" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "[YOUR_DB_PASSWORD]" | gcloud secrets create DB_PASSWORD --data-file=-
\`\`\`

### 3. Build Container
\`\`\`bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/ria-ats .
\`\`\`

### 4. Deploy to Cloud Run
\`\`\`bash
gcloud run deploy ria-ats \\
  --image gcr.io/[PROJECT_ID]/ria-ats \\
  --add-cloudsql-instances [INSTANCE_CONNECTION_NAME] \\
  --update-env-vars DB_NAME=ria_ats,DB_USER=postgres,INSTANCE_CONNECTION_NAME=[INSTANCE_CONNECTION_NAME] \\
  --update-secrets DB_PASSWORD=DB_PASSWORD:latest,API_KEY=GEMINI_API_KEY:latest
\`\`\`

## Database Schema (PostgreSQL)
Run the following SQL in your Cloud SQL instance:

\`\`\`sql
${SQL_SCHEMA}
\`\`\`

## Environment Variables Required
- DB_USER
- DB_NAME
- INSTANCE_CONNECTION_NAME
- API_KEY (Gemini API)
- DB_PASSWORD (via Secret Manager)
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ria-deployment-instructions.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#002b5c] rounded flex items-center justify-center text-[#c5a059]">
              <Server size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#002b5c]">Cloud Run & SQL Deployment</h2>
              <p className="text-slate-500 text-sm">Follow this checklist to move the RIA Talent Portal to production.</p>
            </div>
          </div>
          
          <button 
            onClick={downloadMarkdown}
            className="flex items-center gap-2 bg-[#c5a059] text-[#002b5c] px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#002b5c] hover:text-white transition-all shadow-lg shadow-black/5"
          >
            <Download size={16} />
            Download AI Instructions (.md)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {/* Checklist */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <ListChecks size={16} />
              Pre-Deployment Checklist
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckItem label="Enable Cloud Run API" />
              <CheckItem label="Enable Cloud Build API" />
              <CheckItem label="Enable Secret Manager API" />
              <CheckItem label="Grant Cloud Run Service Account 'Cloud SQL Client' role" />
            </div>
          </section>

          {/* Commands */}
          <section className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <Terminal size={16} />
              Deployment Commands
            </h3>
            <div className="space-y-8">
              {steps.map((step, idx) => (
                <div key={idx} className="relative pl-12">
                  <div className="absolute left-0 top-0 w-8 h-8 bg-[#c5a059] text-[#002b5c] rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">{step.desc}</p>
                  <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between group border border-white/10">
                    <code className="text-[#c5a059] text-xs font-mono break-all whitespace-pre-wrap">{step.cmd}</code>
                    <button 
                      onClick={() => copyToClipboard(step.cmd, `step-${idx}`)}
                      className="text-slate-500 hover:text-white transition-colors ml-4 shrink-0"
                    >
                      {copied === `step-${idx}` ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Schema */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <Database size={16} />
              Database Schema (PostgreSQL)
            </h3>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-200/50 px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileCode size={14} className="text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">init_schema.sql</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(SQL_SCHEMA, 'schema')}
                  className="text-slate-400 hover:text-[#002b5c] transition-colors"
                >
                  {copied === 'schema' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="p-6 text-[10px] font-mono text-slate-600 overflow-x-auto leading-relaxed">
                {SQL_SCHEMA}
              </pre>
            </div>
          </section>
        </div>

        <div className="mt-12 p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
          <Key className="text-amber-600 shrink-0 mt-1" size={24} />
          <div>
            <h4 className="font-bold text-amber-900 text-sm mb-1">Environment Variables</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Ensure your Cloud Run service has the following variables defined: 
              <code className="mx-1 bg-white/50 px-1 rounded">DB_USER</code>, 
              <code className="mx-1 bg-white/50 px-1 rounded">DB_NAME</code>, 
              <code className="mx-1 bg-white/50 px-1 rounded">INSTANCE_CONNECTION_NAME</code>, and 
              <code className="mx-1 bg-white/50 px-1 rounded">API_KEY</code> (Gemini).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
    <div className="w-5 h-5 rounded border-2 border-slate-200 flex items-center justify-center bg-white">
      <Check size={12} className="text-slate-200" />
    </div>
    <span className="text-xs font-medium text-slate-600">{label}</span>
  </div>
);

const SQL_SCHEMA = `CREATE TABLE jobs (
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
VALUES ('u-1', 'Admin User', 'admin@ria.com', 'ADMIN', 'Active', 'Riafinance123');`;

export default DeploymentGuide;
