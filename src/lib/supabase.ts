import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Complaint, ComplaintUpdate, DepartmentStat, RecurringIssue, UserProfile } from '../types/database';

// Get Supabase credentials from Vite environment variables or localStorage override
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('CAMPUSVOICE_SUPABASE_URL') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('CAMPUSVOICE_SUPABASE_ANON_KEY') : null;

  const url = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || '';
  const anonKey = (localKey && localKey.trim()) || (envAnonKey && envAnonKey.trim()) || '';

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-ref') &&
    !anonKey.includes('your-anon-key-here') &&
    url.startsWith('https://')
  );

  return { url, anonKey, isConfigured };
};

const initialConfig = getSupabaseConfig();

// Safe fallback URL for client initialization if unconfigured
const defaultUrl = initialConfig.isConfigured ? initialConfig.url : 'https://placeholder.supabase.co';
const defaultKey = initialConfig.isConfigured ? initialConfig.anonKey : 'placeholder-key';

export const supabase: SupabaseClient = createClient(defaultUrl, defaultKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

// ----------------------------------------------------
// Demo & Fallback In-Memory / Local Store
// Ensures seamless review and testing even before
// environment keys are configured.
// ----------------------------------------------------

export const DEMO_PROFILES: Record<string, UserProfile> = {
  'demo-student-1': {
    id: 'demo-student-1',
    name: 'Aarav Sharma',
    role: 'student',
    department: 'Computer Science',
  },
  'demo-hod-1': {
    id: 'demo-hod-1',
    name: 'Dr. Ramesh Kulkarni (HOD CS)',
    role: 'hod',
    department: 'Computer Science',
  },
  'demo-principal-1': {
    id: 'demo-principal-1',
    name: 'Dr. Sunita Deshmukh (Principal)',
    role: 'principal',
    department: 'Administration',
  },
};

const INITIAL_DEMO_COMPLAINTS: Complaint[] = [
  {
    id: 1001,
    student_id: 'demo-student-1',
    type: 'infrastructure',
    title: 'Lab 2 Workstation #14 GPU Failure and Blue Screens',
    description: 'During Deep Learning lab, Workstation 14 keeps crashing with blue screen of death whenever CUDA models are loaded. Burning smell observed from back fan.',
    location: 'Lab 2, 3rd Floor, CS Block',
    department: 'Computer Science',
    category: 'Hardware',
    priority: 'Critical',
    status: 'In Progress',
    ai_summary: 'Workstation 14 GPU crash and hardware failure with thermal issues in Lab 2.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    student_name: 'Aarav Sharma',
  },
  {
    id: 1002,
    student_id: 'demo-student-1',
    type: 'infrastructure',
    title: 'Ceiling Projector HDMI Port Damaged in Seminar Hall 1',
    description: 'Projector cable is torn and the HDMI port is loose. Visual presentations flicker continuously or lose signal entirely.',
    location: 'Seminar Hall 1, Main Academic Block',
    department: 'Computer Science',
    category: 'Equipment',
    priority: 'High',
    status: 'Under Review',
    ai_summary: 'Seminar Hall 1 projector HDMI connectivity failure causing presentation disruption.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    student_name: 'Aarav Sharma',
  },
  {
    id: 1003,
    student_id: 'demo-student-1',
    type: 'grievance',
    title: 'Delay in Semester 5 Mid-Term Evaluation Recheck Results',
    description: 'Applied for re-evaluation of Advanced Algorithms two weeks ago. Academic deadline for final grading is approaching but no marks update has been published.',
    location: null,
    department: 'Computer Science',
    category: 'Academic Process',
    priority: 'Medium',
    status: 'Submitted',
    ai_summary: 'Student seeking expedited release of Semester 5 Advanced Algorithms re-evaluation results.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    student_name: 'Aarav Sharma',
  },
  {
    id: 1004,
    student_id: 'demo-student-2',
    type: 'infrastructure',
    title: 'Lab 2 AC Unit 1 Leaking Water Near Server Rack',
    description: 'Air conditioner in CS Lab 2 is dripping water directly over power strip and adjacent network switch rack.',
    location: 'Lab 2, 3rd Floor, CS Block',
    department: 'Computer Science',
    category: 'Facility',
    priority: 'Critical',
    status: 'Resolved',
    ai_summary: 'Severe AC condensation leakage near active server rack in Lab 2.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    student_name: 'Priya Patel',
  },
  {
    id: 1005,
    student_id: 'demo-student-3',
    type: 'infrastructure',
    title: 'Lab 2 Workstation #12 Keyboard and Mouse Not Detected',
    description: 'Front USB ports not working, students cannot complete programming assignments.',
    location: 'Lab 2, 3rd Floor, CS Block',
    department: 'Computer Science',
    category: 'Hardware',
    priority: 'Medium',
    status: 'In Progress',
    ai_summary: 'Peripheral connection failure on Lab 2 Workstation 12.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 3.5 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    student_name: 'Rohan Gupta',
  },
  {
    id: 1006,
    student_id: 'demo-student-4',
    type: 'infrastructure',
    title: 'Mechanical Workshop Lathe Machine 3 Vibration',
    description: 'Excessive spindle runout and safety guard loose on Lathe #3.',
    location: 'Mech Workshop Room 102',
    department: 'Mechanical Engineering',
    category: 'Equipment',
    priority: 'High',
    status: 'Submitted',
    ai_summary: 'Vibration and safety guard defect on Workshop Lathe Machine 3.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    student_name: 'Vikram Joshi',
  },
  {
    id: 1007,
    student_id: 'demo-student-5',
    type: 'grievance',
    title: 'Clashing Exam Schedules for Electrical Core & Elective',
    description: 'Power Systems analysis and Embedded IoT exam scheduled at the exact same slot on Thursday.',
    location: null,
    department: 'Electrical Engineering',
    category: 'Academic Process',
    priority: 'High',
    status: 'In Progress',
    ai_summary: 'Direct examination schedule clash between Core and Elective papers.',
    duplicate_of: null,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    student_name: 'Ananya Verma',
  },
];

const INITIAL_DEMO_UPDATES: ComplaintUpdate[] = [
  {
    id: 1,
    complaint_id: 1001,
    author_id: 'demo-student-1',
    status: 'Submitted',
    remark: 'Complaint logged with AI auto-priority classification: Critical.',
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Aarav Sharma',
    author_role: 'student',
  },
  {
    id: 2,
    complaint_id: 1001,
    author_id: 'demo-hod-1',
    status: 'Under Review',
    remark: 'Verified with Lab Assistant Manoj. Workstation 14 isolated to prevent electrical hazard.',
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Dr. Ramesh Kulkarni',
    author_role: 'hod',
  },
  {
    id: 3,
    complaint_id: 1001,
    author_id: 'demo-hod-1',
    status: 'In Progress',
    remark: 'Requisition raised with Dell campus technician for GPU thermal module replacement under warranty.',
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Dr. Ramesh Kulkarni',
    author_role: 'hod',
  },
  {
    id: 4,
    complaint_id: 1002,
    author_id: 'demo-student-1',
    status: 'Submitted',
    remark: 'Complaint registered by student.',
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Aarav Sharma',
    author_role: 'student',
  },
  {
    id: 5,
    complaint_id: 1002,
    author_id: 'demo-hod-1',
    status: 'Under Review',
    remark: 'AV maintenance crew notified. Replacement HDMI repeater cable ordered.',
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Dr. Ramesh Kulkarni',
    author_role: 'hod',
  },
  {
    id: 6,
    complaint_id: 1003,
    author_id: 'demo-student-1',
    status: 'Submitted',
    remark: 'Grievance submitted regarding evaluation delay.',
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Aarav Sharma',
    author_role: 'student',
  },
  {
    id: 7,
    complaint_id: 1004,
    author_id: 'demo-student-2',
    status: 'Submitted',
    remark: 'Severe AC drip reported.',
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Priya Patel',
    author_role: 'student',
  },
  {
    id: 8,
    complaint_id: 1004,
    author_id: 'demo-hod-1',
    status: 'Resolved',
    remark: 'Facilities team cleared drain tray and replaced drain line insulation. Verified dry and functional.',
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    author_name: 'Dr. Ramesh Kulkarni',
    author_role: 'hod',
  },
];

// Helper to get demo state from localStorage or initialize
const getDemoStore = () => {
  if (typeof window === 'undefined') {
    return {
      complaints: INITIAL_DEMO_COMPLAINTS,
      updates: INITIAL_DEMO_UPDATES,
      currentUser: DEMO_PROFILES['demo-student-1'],
    };
  }

  const storedComplaints = localStorage.getItem('CAMPUSVOICE_DEMO_COMPLAINTS');
  const storedUpdates = localStorage.getItem('CAMPUSVOICE_DEMO_UPDATES');
  const storedUser = localStorage.getItem('CAMPUSVOICE_DEMO_USER');

  const complaints: Complaint[] = storedComplaints ? JSON.parse(storedComplaints) : INITIAL_DEMO_COMPLAINTS;
  const updates: ComplaintUpdate[] = storedUpdates ? JSON.parse(storedUpdates) : INITIAL_DEMO_UPDATES;
  const currentUser: UserProfile = storedUser ? JSON.parse(storedUser) : DEMO_PROFILES['demo-student-1'];

  return { complaints, updates, currentUser };
};

const saveDemoStore = (complaints: Complaint[], updates: ComplaintUpdate[], user?: UserProfile) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('CAMPUSVOICE_DEMO_COMPLAINTS', JSON.stringify(complaints));
  localStorage.setItem('CAMPUSVOICE_DEMO_UPDATES', JSON.stringify(updates));
  if (user) {
    localStorage.setItem('CAMPUSVOICE_DEMO_USER', JSON.stringify(user));
  }
};

// ----------------------------------------------------
// Unified Data API (Works with Supabase and Fallback)
// ----------------------------------------------------

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('Supabase profile fetch error:', error);
        return DEMO_PROFILES[userId] || null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('Error fetching profile from Supabase:', err);
    }
  }

  const store = getDemoStore();
  if (store.currentUser && store.currentUser.id === userId) {
    return store.currentUser;
  }
  return DEMO_PROFILES[userId] || store.currentUser;
}

export async function fetchComplaints(params?: {
  student_id?: string;
  department?: string;
  status?: string;
  category?: string;
  priority?: string;
  type?: string;
}): Promise<Complaint[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });

      if (params?.student_id) query = query.eq('student_id', params.student_id);
      if (params?.department) query = query.eq('department', params.department);
      if (params?.status && params.status !== 'All') query = query.eq('status', params.status);
      if (params?.category && params.category !== 'All') query = query.eq('category', params.category);
      if (params?.priority && params.priority !== 'All') query = query.eq('priority', params.priority);
      if (params?.type && params.type !== 'All') query = query.eq('type', params.type);

      const { data, error } = await query;
      if (error) throw error;
      return (data as Complaint[]) || [];
    } catch (err) {
      console.warn('Supabase complaints query fallback:', err);
    }
  }

  // Fallback demo queries
  const { complaints } = getDemoStore();
  let filtered = [...complaints];

  if (params?.student_id) {
    filtered = filtered.filter((c) => c.student_id === params.student_id);
  }
  if (params?.department) {
    filtered = filtered.filter((c) => c.department.toLowerCase() === params.department?.toLowerCase());
  }
  if (params?.status && params.status !== 'All') {
    filtered = filtered.filter((c) => c.status === params.status);
  }
  if (params?.category && params.category !== 'All') {
    filtered = filtered.filter((c) => c.category === params.category);
  }
  if (params?.priority && params.priority !== 'All') {
    filtered = filtered.filter((c) => c.priority === params.priority);
  }
  if (params?.type && params.type !== 'All') {
    filtered = filtered.filter((c) => c.type === params.type);
  }

  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchComplaintById(id: number): Promise<Complaint | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('complaints').select('*').eq('id', id).single();
      if (!error && data) return data as Complaint;
    } catch (err) {
      console.warn('Supabase fetchComplaintById error:', err);
    }
  }

  const { complaints } = getDemoStore();
  return complaints.find((c) => c.id === id) || null;
}

export async function fetchComplaintUpdates(complaintId: number): Promise<ComplaintUpdate[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('complaint_updates')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as ComplaintUpdate[];
    } catch (err) {
      console.warn('Supabase fetchComplaintUpdates error:', err);
    }
  }

  const { updates } = getDemoStore();
  return updates
    .filter((u) => u.complaint_id === complaintId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function createComplaint(
  complaintData: Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'resolved_at' | 'status'> & {
    status?: Complaint['status'];
  },
  authorName?: string
): Promise<Complaint> {
  const status = complaintData.status || 'Submitted';

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          student_id: complaintData.student_id,
          type: complaintData.type,
          title: complaintData.title,
          description: complaintData.description,
          location: complaintData.location || null,
          department: complaintData.department,
          category: complaintData.category,
          priority: complaintData.priority,
          status,
          ai_summary: complaintData.ai_summary || null,
          duplicate_of: complaintData.duplicate_of || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Note: A trigger may create the first update, but if not, ensure the update row exists:
      try {
        const { data: updateCheck } = await supabase
          .from('complaint_updates')
          .select('id')
          .eq('complaint_id', data.id)
          .limit(1);

        if (!updateCheck || updateCheck.length === 0) {
          await supabase.from('complaint_updates').insert({
            complaint_id: data.id,
            author_id: complaintData.student_id,
            status,
            remark: 'Complaint registered by student.',
          });
        }
      } catch {
        // Trigger already handled it
      }

      return data as Complaint;
    } catch (err) {
      console.warn('Supabase createComplaint error, falling back to local store:', err);
    }
  }

  const { complaints, updates } = getDemoStore();
  const maxId = complaints.reduce((max, c) => Math.max(max, c.id), 1000);
  const newId = maxId + 1;
  const now = new Date().toISOString();

  const newComplaint: Complaint = {
    ...complaintData,
    id: newId,
    status,
    created_at: now,
    updated_at: now,
    resolved_at: null,
    student_name: authorName || 'Student',
  };

  const newUpdate: ComplaintUpdate = {
    id: Date.now(),
    complaint_id: newId,
    author_id: complaintData.student_id,
    status: 'Submitted',
    remark: 'Complaint registered by student with AI classification.',
    created_at: now,
    author_name: authorName || 'Student',
    author_role: 'student',
  };

  const updatedComplaints = [newComplaint, ...complaints];
  const updatedUpdates = [...updates, newUpdate];

  saveDemoStore(updatedComplaints, updatedUpdates);
  return newComplaint;
}

export async function updateComplaintStatus(
  complaintId: number,
  newStatus: Complaint['status'],
  authorId: string,
  remark: string,
  authorName?: string,
  authorRole?: UserProfile['role'],
  newPriority?: Complaint['priority'],
  newCategory?: string
): Promise<{ complaint: Complaint; update: ComplaintUpdate }> {
  const now = new Date().toISOString();
  const resolvedAt = newStatus === 'Resolved' ? now : null;

  if (isSupabaseConfigured()) {
    try {
      // 1. Update complaint table
      const updatePayload: Partial<Complaint> = {
        status: newStatus,
        updated_at: now,
        ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
      };
      if (newPriority) updatePayload.priority = newPriority;
      if (newCategory) updatePayload.category = newCategory;

      const { data: updatedComplaint, error: compErr } = await supabase
        .from('complaints')
        .update(updatePayload)
        .eq('id', complaintId)
        .select()
        .single();

      if (compErr) throw compErr;

      // 2. Insert row into complaint_updates
      const { data: updateRow, error: updateErr } = await supabase
        .from('complaint_updates')
        .insert({
          complaint_id: complaintId,
          author_id: authorId,
          status: newStatus,
          remark,
        })
        .select()
        .single();

      if (updateErr) throw updateErr;

      return {
        complaint: updatedComplaint as Complaint,
        update: updateRow as ComplaintUpdate,
      };
    } catch (err) {
      console.warn('Supabase updateComplaintStatus error, falling back:', err);
    }
  }

  const { complaints, updates } = getDemoStore();
  const idx = complaints.findIndex((c) => c.id === complaintId);
  if (idx === -1) throw new Error(`Complaint #${complaintId} not found`);

  const updatedComplaint: Complaint = {
    ...complaints[idx],
    status: newStatus,
    updated_at: now,
    resolved_at: newStatus === 'Resolved' ? now : complaints[idx].resolved_at,
    priority: newPriority || complaints[idx].priority,
    category: newCategory || complaints[idx].category,
  };

  const newUpdate: ComplaintUpdate = {
    id: Date.now(),
    complaint_id: complaintId,
    author_id: authorId,
    status: newStatus,
    remark,
    created_at: now,
    author_name: authorName || 'Staff Member',
    author_role: authorRole || 'hod',
  };

  complaints[idx] = updatedComplaint;
  const updatedUpdates = [...updates, newUpdate];

  saveDemoStore(complaints, updatedUpdates);
  return { complaint: updatedComplaint, update: newUpdate };
}

export async function fetchRecurringIssues(department?: string): Promise<RecurringIssue[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('recurring_issues').select('*');
      if (department) query = query.eq('department', department);
      const { data, error } = await query;
      if (!error && data) return data as RecurringIssue[];
    } catch (err) {
      console.warn('Supabase recurring_issues view error:', err);
    }
  }

  // Derive recurring issues dynamically from demo data
  const { complaints } = getDemoStore();
  const map = new Map<string, { department: string; location: string; category: string; count: number; latest: string }>();

  complaints
    .filter((c) => c.status !== 'Resolved' && c.location)
    .forEach((c) => {
      if (department && c.department.toLowerCase() !== department.toLowerCase()) return;
      const key = `${c.department}_${c.location}_${c.category}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (new Date(c.created_at) > new Date(existing.latest)) {
          existing.latest = c.created_at;
        }
      } else {
        map.set(key, {
          department: c.department,
          location: c.location || 'Campus',
          category: c.category,
          count: 1,
          latest: c.created_at,
        });
      }
    });

  return Array.from(map.values())
    .map((item) => ({
      department: item.department,
      location: item.location,
      category: item.category,
      open_count: item.count,
      latest_reported: item.latest,
    }))
    .sort((a, b) => b.open_count - a.open_count);
}

export async function fetchDepartmentStats(): Promise<DepartmentStat[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('department_stats').select('*');
      if (!error && data) return data as DepartmentStat[];
    } catch (err) {
      console.warn('Supabase department_stats view error:', err);
    }
  }

  // Derive from complaints
  const { complaints } = getDemoStore();
  const departments = Array.from(new Set(complaints.map((c) => c.department)));

  return departments.map((dept) => {
    const deptComplaints = complaints.filter((c) => c.department === dept);
    const resolved = deptComplaints.filter((c) => c.status === 'Resolved');
    const unresolved = deptComplaints.filter((c) => c.status !== 'Resolved');
    const high_priority_open = unresolved.filter((c) => c.priority === 'High' || c.priority === 'Critical').length;

    // Avg resolution hours
    let totalHours = 0;
    resolved.forEach((c) => {
      if (c.resolved_at) {
        const diff = (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 3600);
        totalHours += Math.max(diff, 1);
      } else {
        totalHours += 24;
      }
    });
    const avg_resolution_hours = resolved.length > 0 ? Math.round(totalHours / resolved.length) : 0;

    return {
      department: dept,
      total: deptComplaints.length,
      unresolved: unresolved.length,
      resolved: resolved.length,
      high_priority_open,
      avg_resolution_hours,
    };
  });
}

export async function fetchEscalatedComplaints(department?: string): Promise<Complaint[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('escalated_complaints').select('*');
      if (department) query = query.eq('department', department);
      const { data, error } = await query;
      if (!error && data) return data as Complaint[];
    } catch (err) {
      console.warn('Supabase escalated_complaints view error:', err);
    }
  }

  // Complaints unresolved for more than 3 days
  const { complaints } = getDemoStore();
  const threeDaysAgo = Date.now() - 3 * 24 * 3600 * 1000;

  return complaints.filter((c) => {
    if (department && c.department.toLowerCase() !== department.toLowerCase()) return false;
    const isUnresolved = c.status !== 'Resolved';
    const isOld = new Date(c.created_at).getTime() < threeDaysAgo;
    return isUnresolved && isOld;
  });
}

export function switchDemoUser(profileKey: string): UserProfile {
  const profile = DEMO_PROFILES[profileKey];
  if (profile && typeof window !== 'undefined') {
    localStorage.setItem('CAMPUSVOICE_DEMO_USER', JSON.stringify(profile));
  }
  return profile;
}

export function setCustomSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('CAMPUSVOICE_SUPABASE_URL', url.trim());
    localStorage.setItem('CAMPUSVOICE_SUPABASE_ANON_KEY', anonKey.trim());
    window.location.reload();
  }
}
