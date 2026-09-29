import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Complaint, ComplaintType, ComplaintUpdate, Priority, Status } from '../types/database';
import {
  fetchComplaints,
  createComplaint,
  fetchComplaintUpdates,
} from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { Timeline } from '../components/Timeline';
import { ChatWidget } from '../components/ChatWidget';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Building,
  Tag,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Info,
  Calendar,
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [updatesMap, setUpdatesMap] = useState<Record<number, ComplaintUpdate[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-complaints' | 'new-complaint'>('my-complaints');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Submit Complaint Form State
  const [complaintType, setComplaintType] = useState<ComplaintType>('infrastructure');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Duplicate Warning Modal State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [pendingClassification, setPendingClassification] = useState<{
    category: string;
    priority: Priority;
    summary: string;
    matchingComplaint: Complaint;
  } | null>(null);

  // Detail View State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedUpdates, setSelectedUpdates] = useState<ComplaintUpdate[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch complaints
  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await fetchComplaints({ student_id: user?.id });
      setComplaints(data);

      // Preload updates for active complaints
      const map: Record<number, ComplaintUpdate[]> = {};
      for (const c of data.slice(0, 8)) {
        const upds = await fetchComplaintUpdates(c.id);
        map[c.id] = upds;
      }
      setUpdatesMap(map);
    } catch (err) {
      console.error('Failed to load student complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadComplaints();
    }
  }, [user]);

  // Open detail modal and load timeline
  const handleOpenDetail = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setLoadingDetails(true);
    try {
      const upds = await fetchComplaintUpdates(complaint.id);
      setSelectedUpdates(upds);
      setUpdatesMap((prev) => ({ ...prev, [complaint.id]: upds }));
    } catch (err) {
      console.error('Failed to load updates for complaint #', complaint.id, err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Form Submission Flow with Gemini & Duplicate Check
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (complaintType === 'infrastructure' && !location.trim()) {
      setSubmissionFeedback({
        type: 'error',
        message: 'Please specify the exact location for infrastructure complaints (e.g. Lab 2, 3rd Floor).',
      });
      return;
    }

    setSubmitting(true);
    setSubmissionFeedback(null);

    let aiCategory = complaintType === 'infrastructure' ? 'Equipment' : 'Academic Process';
    let aiPriority: Priority = 'Medium';
    let aiSummary = description.slice(0, 100);

    try {
      // 1. Call Gemini via backend endpoint
      const aiRes = await fetch('/api/ai/classify-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type: complaintType,
          department: user?.department || 'Computer Science',
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiCategory = aiData.category || aiCategory;
        aiPriority = aiData.priority || aiPriority;
        aiSummary = aiData.summary || aiSummary;
      }
    } catch (err) {
      console.warn('AI classification failed, falling back to defaults:', err);
    }

    // 2. Check student's last 30 days for potential duplicate (same location & category or similar)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const recentMatching = complaints.find((c) => {
      const isRecent = new Date(c.created_at).getTime() >= thirtyDaysAgo;
      const isUnresolved = c.status !== 'Resolved';
      const sameCategory = c.category.toLowerCase() === aiCategory.toLowerCase();
      const sameLocation =
        complaintType === 'infrastructure' &&
        location.trim() &&
        c.location &&
        c.location.toLowerCase().includes(location.trim().toLowerCase());

      return isRecent && isUnresolved && (sameLocation || (sameCategory && c.type === complaintType));
    });

    if (recentMatching) {
      // Warn student before saving
      setPendingClassification({
        category: aiCategory,
        priority: aiPriority,
        summary: aiSummary,
        matchingComplaint: recentMatching,
      });
      setDuplicateModalOpen(true);
      setSubmitting(false);
      return;
    }

    // No duplicate detected, proceed to save directly
    await persistComplaint(aiCategory, aiPriority, aiSummary, null);
  };

  const persistComplaint = async (
    category: string,
    priority: Priority,
    summary: string,
    duplicateOfId: number | null
  ) => {
    try {
      setSubmitting(true);
      const newRecord = await createComplaint(
        {
          student_id: user?.id || 'demo-student-1',
          type: complaintType,
          title: title.trim(),
          description: description.trim(),
          location: complaintType === 'infrastructure' ? location.trim() : null,
          department: user?.department || 'Computer Science',
          category,
          priority,
          ai_summary: summary,
          duplicate_of: duplicateOfId,
        },
        user?.name || 'Student'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setPendingClassification(null);
      setDuplicateModalOpen(false);

      setSubmissionFeedback({
        type: 'success',
        message: `Complaint #${newRecord.id} successfully registered with priority: ${newRecord.priority}!`,
      });

      // Reload list and switch to My Complaints
      await loadComplaints();
      setTimeout(() => {
        setActiveTab('my-complaints');
      }, 1200);
    } catch (err: any) {
      setSubmissionFeedback({
        type: 'error',
        message: err.message || 'Failed to submit complaint. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats computation
  const totalSubmitted = complaints.length;
  const pendingCount = complaints.filter((c) => c.status !== 'Resolved').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  // Filter complaints list
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toString().includes(searchQuery);

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesType = typeFilter === 'All' || c.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Student Grievance Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registered Department: <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.department || 'Computer Science'}</span>
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-300/60 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('my-complaints')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'my-complaints'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> My Complaints
          </button>
          <button
            onClick={() => setActiveTab('new-complaint')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'new-complaint'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Submit Issue
          </button>
        </div>
      </div>

      {/* 5. Stats Row at the Top */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Submitted
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {totalSubmitted}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Complaints logged across sessions</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending Resolution
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Under Review & In Progress</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Resolved Tickets
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {resolvedCount}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Successfully closed by HOD / Staff</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'new-complaint' ? (
        /* 1 & 2. Submit Complaint Form */
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Register a New Grievance or Issue
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your submission will be automatically prioritized and categorized by Gemini 2.5 Flash.
            </p>
          </div>

          {submissionFeedback && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
                submissionFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {submissionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{submissionFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-5">
            {/* 1. Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Issue Classification Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setComplaintType('infrastructure')}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    complaintType === 'infrastructure'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Building className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-bold block">Lab & Infrastructure Issue</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Hardware breakdown, equipment fault, classroom AC, projectors, lab PC.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setComplaintType('grievance')}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    complaintType === 'grievance'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <FileText className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-bold block">Academic & General Grievance</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Evaluation delays, timetable clashes, syllabus, teaching pace.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Department (read-only from profile) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department (from your student profile)
              </label>
              <input
                type="text"
                disabled
                value={user?.department || 'Computer Science'}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed"
              />
            </div>

            {/* Location (Shown for Infrastructure Only) */}
            {complaintType === 'infrastructure' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Physical Location & Room
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    Required for recurring issue tracking
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lab 2, 3rd Floor, CS Block or Seminar Hall 1"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issue Summary / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  complaintType === 'infrastructure'
                    ? 'e.g. Workstation #14 GPU failure and blue screen'
                    : 'e.g. Delay in Semester 5 mid-term re-evaluation grades'
                }
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Description & Context
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide specific details such as symptoms, error messages, lab sessions affected, or previous steps taken..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* AI helper info box */}
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Gemini will scan your report to assign an initial category (Hardware, Software, Equipment, Facility, Academic Process, etc.), evaluate urgency (Low to Critical), and check for duplicate reports within the last 30 days.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setDescription('');
                  setLocation('');
                }}
                className="px-4 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Analyzing & Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Submit Complaint
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 3. "My Complaints" Page */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints by title, ID, or keywords..."
                className="w-full text-xs sm:text-sm pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ml-2">
                <span>Type:</span>
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Types</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="grievance">Academic Grievance</option>
              </select>

              <button
                onClick={loadComplaints}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Refresh complaints"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Complaints List (Responsive Cards / Table) */}
          {loading ? (
            <div className="text-center py-16 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading your complaint records...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500 mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No complaints found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'All' || typeFilter !== 'All'
                  ? 'No records match your selected filters. Try broadening your search.'
                  : 'You have not submitted any complaints yet. Use the "Submit Issue" button above to log one.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredComplaints.map((item) => {
                const updates = updatesMap[item.id] || [];
                const latestUpdate = updates.length > 0 ? updates[updates.length - 1] : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            #{item.id}
                          </span>
                          <StatusBadge status={item.status} size="sm" />
                          <PriorityBadge priority={item.priority} size="sm" />
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          {item.duplicate_of && (
                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              Linked to #{item.duplicate_of}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0 space-y-1">
                        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center sm:justify-end gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {item.location && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center sm:justify-end gap-1">
                            <MapPin className="w-3 h-3 text-indigo-500" />
                            <span className="truncate max-w-[180px]">{item.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Latest Remark preview */}
                    {latestUpdate && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Latest Action:</span>
                          <span className="truncate italic">"{latestUpdate.remark}"</span>
                        </div>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Timeline <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Complaint Detail Modal with Vertical Timeline */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    #{selectedComplaint.id}
                  </span>
                  <StatusBadge status={selectedComplaint.status} size="sm" />
                  <PriorityBadge priority={selectedComplaint.priority} size="sm" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedComplaint.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complaint Specs Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Type</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
                  {selectedComplaint.type}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Category</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedComplaint.category}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Department</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedComplaint.department}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Reported Date</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {new Date(selectedComplaint.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Location & AI Summary */}
            {selectedComplaint.location && (
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-medium">Location:</span>
                <span>{selectedComplaint.location}</span>
              </div>
            )}

            {selectedComplaint.ai_summary && (
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Gemini AI Summary
                </div>
                <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  {selectedComplaint.ai_summary}
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Full Description
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Vertical Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" /> Resolution Timeline & Remarks
                </h4>
                <span className="text-[11px] text-slate-400">
                  {selectedUpdates.length} action(s) recorded
                </span>
              </div>

              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading timeline updates...</div>
              ) : (
                <Timeline updates={selectedUpdates} />
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Warning Confirmation Dialog */}
      {duplicateModalOpen && pendingClassification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-amber-300 dark:border-amber-700/80 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Potential Duplicate Issue Detected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A similar complaint was reported within the last 30 days for this location/category.
                </p>
              </div>
            </div>

            {/* Existing Complaint preview */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                  #{pendingClassification.matchingComplaint.id}
                </span>
                <StatusBadge status={pendingClassification.matchingComplaint.status} size="sm" />
                <span className="text-[11px] text-slate-500">
                  {new Date(pendingClassification.matchingComplaint.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {pendingClassification.matchingComplaint.title}
              </p>
              {pendingClassification.matchingComplaint.location && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  {pendingClassification.matchingComplaint.location}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Submitting as a linked duplicate helps the department track ticket frequency without creating redundant work orders. How would you like to proceed?
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDuplicateModalOpen(false);
                  setPendingClassification(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  persistComplaint(
                    pendingClassification.category,
                    pendingClassification.priority,
                    pendingClassification.summary,
                    null
                  )
                }
                className="px-3.5 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl"
              >
                Submit as Fresh Ticket
              </button>

              <button
                type="button"
                onClick={() =>
                  persistComplaint(
                    pendingClassification.category,
                    pendingClassification.priority,
                    pendingClassification.summary,
                    pendingClassification.matchingComplaint.id
                  )
                }
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                Link as Duplicate & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Chatbot Widget */}
      <ChatWidget complaints={complaints} updates={Object.values(updatesMap).flat()} />
    </div>
  );
};
