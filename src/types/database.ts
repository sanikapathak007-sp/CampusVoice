export type UserRole = 'student' | 'hod' | 'principal';

export type ComplaintType = 'infrastructure' | 'grievance';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type Status = 'Submitted' | 'Under Review' | 'In Progress' | 'Resolved';

export interface UserProfile {
  id: string; // uuid matching auth.users id
  name: string;
  role: UserRole;
  department: string;
}

export interface Complaint {
  id: number;
  student_id: string;
  type: ComplaintType;
  title: string;
  description: string;
  location: string | null;
  department: string;
  category: string;
  priority: Priority;
  status: Status;
  ai_summary: string | null;
  duplicate_of: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  student_name?: string;
}

export interface ComplaintUpdate {
  id: number | string;
  complaint_id: number;
  author_id: string;
  status: Status;
  remark: string;
  created_at: string;
  author_name?: string;
  author_role?: UserRole;
}

export interface RecurringIssue {
  department: string;
  location: string;
  category: string;
  open_count: number;
  latest_reported: string;
}

export interface DepartmentStat {
  department: string;
  total: number;
  unresolved: number;
  resolved: number;
  high_priority_open: number;
  avg_resolution_hours: number;
}

export interface EscalatedComplaint extends Complaint {
  days_open?: number;
}
