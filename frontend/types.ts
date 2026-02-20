
export enum EmploymentType {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRACT = 'Contract',
  CONTRACT_TO_HIRE = 'Contract-to-hire',
  INTERN = 'Intern'
}

export enum WorkMode {
  REMOTE = 'Remote',
  HYBRID = 'Hybrid',
  ONSITE = 'On-site'
}

export enum SalaryUnit {
  ANNUAL = 'Annually',
  HOURLY = 'Per Hour'
}

export enum CandidateStage {
  APPLIED = 'Applied',
  PHONE_SCREEN = 'Phone Screen',
  IN_HOUSE_INTERVIEW = 'In-house Interview',
  OFFER = 'Offer',
  HIRED = 'Hired',
  REJECTED = 'Rejected'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  HR = 'HR',
  BUSINESS = 'BUSINESS',
  EXTERNAL = 'EXTERNAL'
}

export enum Permission {
  CREATE_JOB = 'CREATE_JOB',
  EDIT_JOB = 'EDIT_JOB',
  DELETE_JOB = 'DELETE_JOB',
  VIEW_CANDIDATES = 'VIEW_CANDIDATES',
  MANAGE_STAGES = 'MANAGE_STAGES',
  ADD_NOTES = 'ADD_NOTES',
  REFER_CANDIDATES = 'REFER_CANDIDATES',
  VIEW_REPORTS = 'VIEW_REPORTS',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',
  MANAGE_USERS = 'MANAGE_USERS',
  APPLY_JOBS = 'APPLY_JOBS'
}

export type RolePermissions = Record<UserRole, Permission[]>;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  status: 'Active' | 'Inactive';
  profile?: {
    phone?: string;
    address?: string;
    summary?: string;
    skills?: string[];
    resumeFileName?: string;
  };
}

export interface Job {
  id: string;
  title: string;
  description: string;
  salaryMin: number;
  salaryMax: number;
  salaryUnit: SalaryUnit;
  type: EmploymentType;
  mode: WorkMode;
  status: 'Open' | 'Closed';
  createdAt: string;
  referenceFileName?: string;
}

export interface CandidateEvent {
  id: string;
  stage: CandidateStage;
  timestamp: string;
  note: string;
  interviewer?: string;
  reason?: string;
  authorRole?: UserRole;
  authorName?: string;
  attachmentName?: string;
  attachmentData?: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  summary?: string;
  skills?: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  currentStage: CandidateStage;
  history: CandidateEvent[];
  appliedAt: string;
  referredBy?: string;
  assignedInterviewerIds?: string[];
  scheduledInterview?: {
    date: string;
    time: string;
    type: CandidateStage;
  };
  matchScore?: number; // AI-calculated suitability percentage (0-100)
}

export type View = 'dashboard' | 'jobs' | 'candidates' | 'reports' | 'public' | 'profile' | 'permissions' | 'users';
