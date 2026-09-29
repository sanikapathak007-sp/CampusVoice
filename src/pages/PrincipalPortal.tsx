import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Complaint,
  DepartmentStat,
  RecurringIssue,
} from '../types/database';
import {
  fetchComplaints,
  fetchDepartmentStats,
  fetchRecurringIssues,
  fetchEscalatedComplaints,
} from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ChatWidget } from '../components/ChatWidget';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  FileText,
  MapPin,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export const PrincipalPortal: React.FC = () => {
  const { user } = useAuth();

  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<RecurringIssue[]>([]);
  const [escalatedComplaints, setEscalatedComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<{
    summary: string;
    trends: string[];
    recommendations: string[];
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Active Tab for Tables
  const [tableTab, setTableTab] = useState<'critical' | 'escalated' | 'recurring'>('critical');

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, stats, recurring, escalated] = await Promise.all([
        fetchComplaints(),
        fetchDepartmentStats(),
        fetchRecurringIssues(),
        fetchEscalatedComplaints(),
      ]);

      setAllComplaints(comps);
      setDepartmentStats(stats);
      setRecurringIssues(recurring);
      setEscalatedComplaints(escalated);
    } catch (err) {
      console.error('Failed to load Principal portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 5. "AI Insights" Button Trigger
  const handleGenerateAiInsights = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentStats,
          recurringIssues,
          escalatedCount: escalatedComplaints.length,
          totalOpen: allComplaints.filter((c) => c.status !== 'Resolved').length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiInsights(data);
      }
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Filter complaints based on user selection
  const filteredComplaints = allComplaints.filter((c) => {
    if (selectedDept !== 'All' && c.department !== selectedDept) return false;
    if (selectedType !== 'All' && c.type !== selectedType) return false;
    if (selectedStatus !== 'All' && c.status !== selectedStatus) return false;

    if (dateRange === '7d') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      if (new Date(c.created_at).getTime() < sevenDaysAgo) return false;
    } else if (dateRange === '30d') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
      if (new Date(c.created_at).getTime() < thirtyDaysAgo) return false;
    }

    return true;
  });

  // 1. Cross-department overview cards calculations
  const totalComplaints = filteredComplaints.length;
  const unresolvedComplaints = filteredComplaints.filter((c) => c.status !== 'Resolved').length;
  const highPriorityOpen = filteredComplaints.filter(
    (c) => (c.priority === 'High' || c.priority === 'Critical') && c.status !== 'Resolved'
  ).length;

  const resolved = filteredComplaints.filter((c) => c.status === 'Resolved');
  let avgResolutionHours = 0;
  if (resolved.length > 0) {
    const sum = resolved.reduce((acc, c) => {
      const start = new Date(c.created_at).getTime();
      const end = c.resolved_at ? new Date(c.resolved_at).getTime() : Date.now();
      return acc + Math.max((end - start) / (1000 * 3600), 1);
    }, 0);
    avgResolutionHours = Math.round(sum / resolved.length);
  }

  // 2. Recharts Data Preps
  // Bar Chart: Complaints by Department
  const departmentChartData = departmentStats.map((ds) => ({
    name: ds.department.replace(' Engineering', '').replace('Computer Science', 'CS'),
    Resolved: ds.resolved,
    Unresolved: ds.unresolved,
    Total: ds.total,
  }));

  // Pie Chart: Complaints by Category
  const categoryCountMap: Record<string, number> = {};
  filteredComplaints.forEach((c) => {
    categoryCountMap[c.category] = (categoryCountMap[c.category] || 0) + 1;
  });
  const categoryPieData = Object.entries(categoryCountMap).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = [
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#f97316', // Orange
    '#64748b', // Slate
  ];

  // Line Chart: Trend over time (grouped by day)
  const dateTrendMap: Record<string, number> = {};
  filteredComplaints.forEach((c) => {
    const dStr = new Date(c.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    dateTrendMap[dStr] = (dateTrendMap[dStr] || 0) + 1;
  });
  const trendLineData = Object.entries(dateTrendMap).map(([date, count]) => ({
    date,
    complaints: count,
  }));

  // High & Critical unresolved tickets
  const criticalTickets = allComplaints.filter(
    (c) => (c.priority === 'Critical' || c.priority === 'High') && c.status !== 'Resolved'
  );

  const departmentsList = [
    'All',
    'Computer Science',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Civil Engineering',
    'Electronics & Communication',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Principal Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Institutional oversight, cross-department trends, automated escalation audit, and strategic AI forecasting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 5. AI Insights Action Button */}
          <button
            onClick={handleGenerateAiInsights}
            disabled={loadingAi}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-purple-500/20 transition-all disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${loadingAi ? 'animate-spin' : ''}`} />
            {loadingAi ? 'Generating AI Insights...' : 'Generate AI Insights'}
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            title="Reload Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Global Filters Bar */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>

        {/* Department Filter */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
        >
          {departmentsList.map((d) => (
            <option key={d} value={d}>
              {d === 'All' ? 'All Departments' : d}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="All">All Types</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="grievance">Academic Grievance</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="All">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        {/* Date Range Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 ml-auto">
          <button
            onClick={() => setDateRange('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              dateRange === 'all'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              dateRange === '30d'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange('7d')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              dateRange === '7d'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* 5. AI Insights Card (Rendered when generated) */}
      {aiInsights && (
        <div className="bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-500/30 relative overflow-hidden animate-in fade-in duration-200">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-purple-300">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Gemini 2.5 Flash Executive Synthesis
              </div>
              <button
                onClick={() => setAiInsights(null)}
                className="text-xs text-purple-300/80 hover:text-white"
              >
                Dismiss
              </button>
            </div>

            <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed max-w-4xl">
              {aiInsights.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              {/* Trends */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Identified Root Trends
                </h4>
                <ul className="space-y-1.5">
                  {aiInsights.trends.map((t, i) => (
                    <li key={i} className="text-xs text-indigo-100/90 flex items-start gap-2 leading-relaxed">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Recommended Institutional Actions
                </h4>
                <ul className="space-y-1.5">
                  {aiInsights.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-emerald-100/90 flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Cross-Department Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Complaints
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalComplaints}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Institutional records logged</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Unresolved Issues
          </p>
          <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {unresolvedComplaints}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Currently open across departments</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            High / Critical Open
          </p>
          <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {highPriorityOpen}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Urgent safety / lab bottlenecks</p>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Avg Resolution Hours
          </p>
          <h3 className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {avgResolutionHours}h
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Campus-wide turnaround time</p>
        </div>
      </div>

      {/* 2. Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart: Complaints by Department */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Complaints by Department (view: department_stats)
            </h3>
            <span className="text-[11px] text-slate-400">Resolved vs Unresolved</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Unresolved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Complaints by Category */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-purple-500" />
              Distribution by Category
            </h3>
            <span className="text-[11px] text-slate-400">{categoryPieData.length} categories</span>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            {categoryPieData.length === 0 ? (
              <p className="text-xs text-slate-400">No category data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Line Chart: Velocity / Trend over days */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Complaint Submission Velocity Over Time
            </h3>
            <span className="text-[11px] text-slate-400">Incoming Issue Volume</span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendLineData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="complaints"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Tables: Critical Unresolved, Escalated, and Recurring Issues */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2 gap-2">
          <button
            onClick={() => setTableTab('critical')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              tableTab === 'critical'
                ? 'bg-white dark:bg-slate-850 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> High & Critical Unresolved ({criticalTickets.length})
          </button>
          <button
            onClick={() => setTableTab('escalated')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              tableTab === 'escalated'
                ? 'bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Escalated Complaints (&gt;3 Days) ({escalatedComplaints.length})
          </button>
          <button
            onClick={() => setTableTab('recurring')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              tableTab === 'recurring'
                ? 'bg-white dark:bg-slate-850 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Recurring Issues View ({recurringIssues.length})
          </button>
        </div>

        {/* Tab 1: Critical & High Unresolved */}
        {tableTab === 'critical' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Issue Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {criticalTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No high or critical open issues at this time.
                    </td>
                  </tr>
                ) : (
                  criticalTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        #{t.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {t.department}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{t.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{t.location || t.category}</p>
                      </td>
                      <td className="py-3 px-4">
                        <PriorityBadge priority={t.priority} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Escalated Complaints */}
        {tableTab === 'escalated' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Title & Context</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Days Overdue</th>
                  <th className="py-3 px-4">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {escalatedComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Zero escalated complaints. All tickets resolved within 72h SLA!
                    </td>
                  </tr>
                ) : (
                  escalatedComplaints.map((c) => {
                    const daysOpen = Math.round(
                      (Date.now() - new Date(c.created_at).getTime()) / (1000 * 3600 * 24)
                    );

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="py-3 px-4 font-mono font-bold text-rose-600">#{c.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {c.department}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{c.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{c.description}</p>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={c.status} size="sm" />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                            {daysOpen} days open
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          Requires HOD intervention
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Recurring Issues */}
        {tableTab === 'recurring' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Location / Room</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Open Count</th>
                  <th className="py-3 px-4">Latest Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recurringIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No recurring fault clusters found.
                    </td>
                  </tr>
                ) : (
                  recurringIssues.map((ri, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {ri.department}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        {ri.location}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ri.category}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                          {ri.open_count} open complaints
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(ri.latest_reported).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating AI Chatbot */}
      <ChatWidget complaints={allComplaints} />
    </div>
  );
};
