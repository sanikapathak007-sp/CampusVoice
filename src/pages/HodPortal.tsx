import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Complaint,
  ComplaintUpdate,
  Priority,
  RecurringIssue,
  Status,
} from '../types/database';
import {
  fetchComplaints,
  fetchRecurringIssues,
  fetchEscalatedComplaints,
  fetchComplaintUpdates,
  updateComplaintStatus,
} from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { Timeline } from '../components/Timeline';
import { ChatWidget } from '../components/ChatWidget';
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  ArrowUpDown,
  Building,
  MapPin,
  RefreshCw,
  X,
  Send,
  Sparkles,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react';

export const HodPortal: React.FC = () => {
  const { user } = useAuth();
  const department = user?.department || 'Computer Science';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<RecurringIssue[]>([]);
  const [escalatedIds, setEscalatedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'priority' | 'status'>('date_desc');

  // Detail & Action Panel
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [activeUpdates, setActiveUpdates] = useState<ComplaintUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  // Form in Detail Panel
  const [editStatus, setEditStatus] = useState<Status>('Under Review');
  const [editPriority, setEditPriority] = useState<Priority>('Medium');
  const [editCategory, setEditCategory] = useState<string>('Hardware');
  const [newRemark, setNewRemark] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, recurring, escalated] = await Promise.all([
        fetchComplaints({ department }),
        fetchRecurringIssues(department),
        fetchEscalatedComplaints(department),
      ]);

      setComplaints(comps);
      setRecurringIssues(recurring);
      setEscalatedIds(new Set(escalated.map((e) => e.id)));
    } catch (err) {
      console.error('Error loading HOD dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [department]);

  // Open complaint panel
  const handleSelectComplaint = async (complaint: Complaint) => {
    setActiveComplaint(complaint);
    setEditStatus(complaint.status);
    setEditPriority(complaint.priority);
    setEditCategory(complaint.category);
    setNewRemark('');
    setActionSuccess(null);
    setLoadingUpdates(true);

    try {
      const upds = await fetchComplaintUpdates(complaint.id);
      setActiveUpdates(upds);
    } catch (err) {
      console.error('Failed to load updates:', err);
    } finally {
      setLoadingUpdates(false);
    }
  };

  // 3. Save Complaint Update
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;
    if (!newRemark.trim()) {
      alert('Please enter a remark explaining the status change or action taken.');
      return;
    }

    setSavingAction(true);
    setActionSuccess(null);

    try {
      const { complaint: updatedComp, update: newUpd } = await updateComplaintStatus(
        activeComplaint.id,
        editStatus,
        user?.id || 'demo-hod-1',
        newRemark.trim(),
        user?.name || 'Dr. Ramesh Kulkarni (HOD)',
        user?.role || 'hod',
        editPriority,
        editCategory
      );

      // Update active state
      setActiveComplaint(updatedComp);
      setActiveUpdates((prev) => [...prev, newUpd]);
      setNewRemark('');
      setActionSuccess('Update saved successfully and logged to timeline.');

      // Refresh master list
      await loadData();
    } catch (err: any) {
      console.error('Failed to update complaint:', err);
      alert(err.message || 'Error updating complaint');
    } finally {
      setSavingAction(false);
    }
  };

  // 1. Summary Cards Calculation
  const pendingCount = complaints.filter(
    (c) => c.status === 'Submitted' || c.status === 'Under Review'
  ).length;

  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;

  const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const resolvedThisWeek = complaints.filter(
    (c) => c.status === 'Resolved' && c.resolved_at && new Date(c.resolved_at).getTime() >= oneWeekAgo
  ).length;

  const highPriorityOpen = complaints.filter(
    (c) => (c.priority === 'High' || c.priority === 'Critical') && c.status !== 'Resolved'
  ).length;

  // Average resolution time in hours
  const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved');
  let avgResolutionHours = 0;
  if (resolvedComplaints.length > 0) {
    const totalHours = resolvedComplaints.reduce((acc, c) => {
      const start = new Date(c.created_at).getTime();
      const end = c.resolved_at ? new Date(c.resolved_at).getTime() : Date.now();
      return acc + Math.max((end - start) / (1000 * 3600), 1);
    }, 0);
    avgResolutionHours = Math.round(totalHours / resolvedComplaints.length);
  }

  // Filter & Sort complaints
  const filteredComplaints = complaints
    .filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toString().includes(searchQuery) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      const matchesType = typeFilter === 'All' || c.type === typeFilter;
      const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'priority') {
        const pWeight: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return pWeight[b.priority] - pWeight[a.priority];
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  const categories = [
    'All',
    'Hardware',
    'Software',
    'Equipment',
    'Facility',
    'Teaching',
    'Academic Workload',
    'Academic Process',
    'Other',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              HOD Department Control Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {department}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Departmental issue triage, status updates, recurring fault tracking, and escalation monitoring.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Triage
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{pendingCount}</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Submitted & Under Review</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            In Progress
          </p>
          <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inProgressCount}</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assigned to staff/tech</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Resolved This Week
          </p>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedThisWeek}</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Past 7 days closed</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            High / Critical Open
          </p>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{highPriorityOpen}</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Action required immediately</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Avg Resolution Time
          </p>
          <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {avgResolutionHours}h
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Based on closed tickets</p>
        </div>
      </div>

      {/* 4. "Recurring Problems" Section */}
      {recurringIssues.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-5 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Recurring Departmental Hotspots (View: recurring_issues)</span>
            </div>
            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              Multiple open complaints in same room/category
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recurringIssues.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="bg-white/90 dark:bg-slate-850/90 p-3.5 rounded-xl border border-amber-200 dark:border-slate-800 shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    {item.location}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {item.open_count} open complaints
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Category: <strong>{item.category}</strong></span>
                  <span className="text-slate-400">
                    Latest: {new Date(item.latest_reported).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Left Table & Right Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2. Table of Complaints */}
        <div className={`space-y-4 ${activeComplaint ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, title, description, or location..."
                className="w-full text-xs sm:text-sm pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Filter className="w-3 h-3" /> Filters:
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="ml-auto flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <ArrowUpDown className="w-3 h-3" /> Sort:
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="priority">Priority (High to Low)</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                Loading complaints...
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">No complaints matching filter criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Escalation</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredComplaints.map((item) => {
                      const isEscalated = escalatedIds.has(item.id);
                      const isSelected = activeComplaint?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleSelectComplaint(item)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            #{item.id}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {item.location || item.category} • {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <PriorityBadge priority={item.priority} size="sm" />
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={item.status} size="sm" />
                          </td>
                          <td className="py-3 px-4">
                            {/* 5. Escalation Flag */}
                            {isEscalated ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-900 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Overdue (&gt;3d)
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Normal</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectComplaint(item);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 3. Complaint Detail & Action Panel */}
        {activeComplaint && (
          <div className="lg:col-span-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md p-5 sm:p-6 space-y-5 sticky top-20 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    Ticket #{activeComplaint.id}
                  </span>
                  {escalatedIds.has(activeComplaint.id) && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                      OVERDUE
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {activeComplaint.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveComplaint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description & Specs */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {activeComplaint.description}
              </div>

              {activeComplaint.ai_summary && (
                <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">{activeComplaint.ai_summary}</p>
                </div>
              )}

              {activeComplaint.location && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  Room / Location: <strong className="text-slate-700 dark:text-slate-200">{activeComplaint.location}</strong>
                </p>
              )}
            </div>

            {/* Status Change & Remark Form */}
            <form onSubmit={handleSaveAction} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> Update Status & Add Staff Remark
              </h4>

              {actionSuccess && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {actionSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    New Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Status)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-medium"
                >
                  {categories.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Staff Remark / Action Taken (Required)
                </label>
                <textarea
                  required
                  rows={2}
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="e.g. Technician dispatched to inspect Lab 2; parts ordered under warranty."
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={savingAction || !newRemark.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {savingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Save Status & Log to Timeline
                  </>
                )}
              </button>
            </form>

            {/* Vertical Timeline */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Complaint Timeline History
              </h4>

              {loadingUpdates ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading timeline...</div>
              ) : (
                <Timeline updates={activeUpdates} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Chatbot */}
      <ChatWidget complaints={complaints} />
    </div>
  );
};
