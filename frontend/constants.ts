
import { Job, Candidate, CandidateStage, EmploymentType, WorkMode, UserRole, Permission, RolePermissions, User, SalaryUnit } from './types';

export const DEFAULT_PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.HR]: [
    Permission.CREATE_JOB,
    Permission.EDIT_JOB,
    Permission.VIEW_CANDIDATES,
    Permission.MANAGE_STAGES,
    Permission.ADD_NOTES,
    Permission.VIEW_REPORTS
  ],
  [UserRole.BUSINESS]: [
    Permission.VIEW_CANDIDATES,
    Permission.ADD_NOTES,
    Permission.REFER_CANDIDATES
  ],
  [UserRole.EXTERNAL]: [
    Permission.APPLY_JOBS
  ]
};

export const SEED_USERS: User[] = [
  { id: 'u-1', name: 'Admin User', email: 'admin@ria.com', role: UserRole.ADMIN, password: 'Riafinance123', status: 'Active' },
  { id: 'u-2', name: 'HR Manager', email: 'hr@ria.com', role: UserRole.HR, password: 'password123', status: 'Active' },
  { id: 'u-3', name: 'Business Lead', email: 'business@ria.com', role: UserRole.BUSINESS, password: 'password123', status: 'Active' },
  { id: 'u-4', name: 'John Applicant', email: 'john@external.com', role: UserRole.EXTERNAL, password: 'password123', status: 'Active' },
];

export const SEED_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    description: 'We are looking for a React expert to lead our UI team...',
    salaryMin: 140000,
    salaryMax: 180000,
    salaryUnit: SalaryUnit.ANNUAL,
    type: EmploymentType.FULL_TIME,
    mode: WorkMode.REMOTE,
    status: 'Open',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job-2',
    title: 'Product Designer',
    description: 'Join our design team to create beautiful user experiences...',
    salaryMin: 110000,
    salaryMax: 150000,
    salaryUnit: SalaryUnit.ANNUAL,
    type: EmploymentType.FULL_TIME,
    mode: WorkMode.HYBRID,
    status: 'Open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const SEED_CANDIDATES: Candidate[] = [
  {
    id: 'cand-1',
    jobId: 'job-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    currentStage: CandidateStage.PHONE_SCREEN,
    appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    history: [
      {
        id: 'ev-1',
        stage: CandidateStage.APPLIED,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Applied via LinkedIn',
        authorRole: UserRole.EXTERNAL,
        authorName: 'Alice Smith'
      }
    ]
  }
];
