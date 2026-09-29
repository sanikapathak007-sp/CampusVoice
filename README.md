# CampusVoice - Smart College Issue & Grievance Management System

CampusVoice is a modern, responsive, role-based issue and grievance tracking platform for colleges and universities.

## Required Environment Variables

To run CampusVoice with full Supabase and Gemini AI integration, configure the following environment variables:

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL | Supabase Dashboard -> Project Settings -> API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Project public anon key | Supabase Dashboard -> Project Settings -> API |
| `GEMINI_API_KEY` | Gemini API key for intelligent classification & chatbot | Google AI Studio Secrets / Environment Variables |

## Database Schema & Roles

CampusVoice connects to the following existing tables and views in Supabase:
- `profiles` (`id` uuid = auth user id, `name`, `role` ['student' | 'hod' | 'principal'], `department`)
- `complaints` (`id` int starting at 1001, `student_id`, `type` ['infrastructure' | 'grievance'], `title`, `description`, `location`, `department`, `category`, `priority`, `status`, `ai_summary`, `duplicate_of`, `created_at`, `updated_at`, `resolved_at`)
- `complaint_updates` (`id`, `complaint_id`, `author_id`, `status`, `remark`, `created_at`)
- Views: `recurring_issues`, `department_stats`, `escalated_complaints`

## Roles & Portals
- **Student Portal (`/student`)**: Submit complaints with Gemini classification and duplicate detection, view complaint timeline, stats.
- **HOD Portal (`/hod`)**: Department complaints management, update status & remarks, view recurring issues and overdue escalations.
- **Principal Portal (`/principal`)**: Institution-wide Recharts analytics, department comparisons, AI insights summary.
- **CampusVoice AI Assistant**: Interactive floating AI chatbot querying real complaints via Gemini function calling.
