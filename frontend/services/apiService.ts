
import { Job, Candidate, User, RolePermissions } from '../types';

const API_BASE = '/api';

export const apiService = {
  // Jobs
  async getJobs(): Promise<Job[]> {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async createJob(job: Job): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });
    return res.json();
  },

  async updateJob(job: Job): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });
    return res.json();
  },

  // Candidates
  async getCandidates(): Promise<Candidate[]> {
    const res = await fetch(`${API_BASE}/candidates`);
    if (!res.ok) throw new Error('Failed to fetch candidates');
    return res.json();
  },

  async createCandidate(candidate: Candidate): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    });
    return res.json();
  },

  async updateCandidate(candidate: Candidate): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    });
    return res.json();
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  }
};
