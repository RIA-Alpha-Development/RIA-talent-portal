import { Job, Candidate, User } from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'tf_auth_token';

// ============================================================================
// Token Management
// ============================================================================

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// Request Helper with Auth
// ============================================================================

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    clearToken();
    // Optionally redirect to login or dispatch event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  return response;
}

// ============================================================================
// Auth Types
// ============================================================================

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
}

// ============================================================================
// API Service
// ============================================================================

export const apiService = {
  // ========== Authentication ==========

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || 'Login failed');
    }

    const data: LoginResponse = await res.json();
    setToken(data.token);
    return data;
  },

  async verifyToken(): Promise<AuthUser | null> {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/verify`);
      if (!res.ok) {
        clearToken();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      clearToken();
      return null;
    }
  },

  async refreshToken(): Promise<string | null> {
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/refresh`, {
        method: 'POST',
      });
      if (!res.ok) return null;
      const data = await res.json();
      setToken(data.token);
      return data.token;
    } catch {
      return null;
    }
  },

  logout(): void {
    clearToken();
    localStorage.removeItem('tf_user');
    localStorage.removeItem('tf_perms');
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },

  getToken,

  // ========== Jobs ==========

  async getJobs(): Promise<Job[]> {
    const res = await fetchWithAuth(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async createJob(job: Job): Promise<Job> {
    const res = await fetchWithAuth(`${API_BASE}/jobs`, {
      method: 'POST',
      body: JSON.stringify(job),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create job' }));
      throw new Error(error.error || 'Failed to create job');
    }
    return res.json();
  },

  async updateJob(job: Job): Promise<Job> {
    const res = await fetchWithAuth(`${API_BASE}/jobs/${job.id}`, {
      method: 'PUT',
      body: JSON.stringify(job),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to update job' }));
      throw new Error(error.error || 'Failed to update job');
    }
    return res.json();
  },

  async deleteJob(jobId: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/jobs/${jobId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to delete job' }));
      throw new Error(error.error || 'Failed to delete job');
    }
  },

  // ========== Candidates ==========

  async getCandidates(): Promise<Candidate[]> {
    const res = await fetchWithAuth(`${API_BASE}/candidates`);
    if (!res.ok) throw new Error('Failed to fetch candidates');
    return res.json();
  },

  async createCandidate(candidate: Candidate): Promise<Candidate> {
    const res = await fetchWithAuth(`${API_BASE}/candidates`, {
      method: 'POST',
      body: JSON.stringify(candidate),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create candidate' }));
      throw new Error(error.error || 'Failed to create candidate');
    }
    return res.json();
  },

  async updateCandidate(candidate: Candidate): Promise<Candidate> {
    const res = await fetchWithAuth(`${API_BASE}/candidates/${candidate.id}`, {
      method: 'PUT',
      body: JSON.stringify(candidate),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to update candidate' }));
      throw new Error(error.error || 'Failed to update candidate');
    }
    return res.json();
  },

  async deleteCandidate(candidateId: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/candidates/${candidateId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to delete candidate' }));
      throw new Error(error.error || 'Failed to delete candidate');
    }
  },

  // ========== Users ==========

  async getUsers(): Promise<User[]> {
    const res = await fetchWithAuth(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(user: Omit<User, 'id'> & { id: string; password: string }): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE}/users`, {
      method: 'POST',
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create user' }));
      throw new Error(error.error || 'Failed to create user');
    }
    return res.json();
  },

  async updateUser(user: User & { password?: string }): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to update user' }));
      throw new Error(error.error || 'Failed to update user');
    }
    return res.json();
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to delete user' }));
      throw new Error(error.error || 'Failed to delete user');
    }
  },

  // ========== AI Features ==========

  async extractCandidateDetails(resumeText: string): Promise<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    summary?: string;
    skills?: string[];
  }> {
    const res = await fetch(`${API_BASE}/ai/extract-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to extract candidate details' }));
      throw new Error(error.error || 'Failed to extract candidate details');
    }
    return res.json();
  },

  async extractJobDetails(text: string): Promise<{
    title?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryUnit?: string;
    type?: string;
    mode?: string;
    description?: string;
  }> {
    const res = await fetchWithAuth(`${API_BASE}/ai/extract-job`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to extract job details' }));
      throw new Error(error.error || 'Failed to extract job details');
    }
    return res.json();
  },

  async generateJobDescription(prompt: string): Promise<string> {
    const res = await fetchWithAuth(`${API_BASE}/ai/generate-job-description`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to generate job description' }));
      throw new Error(error.error || 'Failed to generate job description');
    }
    const data = await res.json();
    return data.description;
  },

  async calculateMatchScore(resumeText: string, jobDescription: string): Promise<number> {
    const res = await fetch(`${API_BASE}/ai/calculate-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, jobDescription }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.score || 0;
  },

  async summarizeInterviewNotes(transcript: string): Promise<string> {
    const res = await fetchWithAuth(`${API_BASE}/ai/summarize-notes`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to summarize notes' }));
      throw new Error(error.error || 'Failed to summarize notes');
    }
    const data = await res.json();
    return data.summary;
  },

  // ========== File Upload ==========

  async getUploadSignedUrl(
    fileName: string,
    contentType: string,
    candidateId?: string
  ): Promise<{
    signedUrl: string;
    fileUrl: string;
    filePath: string;
    expiresAt: string;
  }> {
    const res = await fetchWithAuth(`${API_BASE}/uploads/signed-url`, {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType, candidateId }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to get upload URL' }));
      throw new Error(error.error || 'Failed to get upload URL');
    }
    return res.json();
  },

  async uploadFile(file: File, candidateId?: string): Promise<string> {
    // Get signed URL from backend
    const { signedUrl, fileUrl } = await this.getUploadSignedUrl(
      file.name,
      file.type,
      candidateId
    );

    // Upload directly to GCS using signed URL
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload file to storage');
    }

    return fileUrl;
  },

  async getDownloadUrl(candidateId: string): Promise<string> {
    const res = await fetchWithAuth(`${API_BASE}/uploads/download-url/${candidateId}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to get download URL' }));
      throw new Error(error.error || 'Failed to get download URL');
    }
    const data = await res.json();
    return data.downloadUrl;
  },
};
