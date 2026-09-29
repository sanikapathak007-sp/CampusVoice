import React from 'react';
import { ComplaintUpdate } from '../types/database';
import { StatusBadge } from './StatusBadge';
import { Clock, User, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TimelineProps {
  updates: ComplaintUpdate[];
}

export const Timeline: React.FC<TimelineProps> = ({ updates }) => {
  if (!updates || updates.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        No updates recorded yet. The first status update will appear here.
      </div>
    );
  }

  // Format relative or pretty date
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: 'Recently', time: '' };
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {updates.map((item, index) => {
        const { date, time } = formatDate(item.created_at);
        const isLatest = index === updates.length - 1;

        return (
          <div key={item.id || index} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 top-1.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-white dark:ring-slate-900 transition-colors ${
                item.status === 'Resolved'
                  ? 'bg-emerald-500 text-white'
                  : isLatest
                  ? 'bg-indigo-600 text-white animate-pulse'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {item.status === 'Resolved' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-white dark:bg-slate-200" />
              )}
            </div>

            {/* Timeline Card */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} size="sm" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {date} {time}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {item.author_role === 'hod' || item.author_role === 'principal' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="font-medium">{item.author_name || (item.author_role ? item.author_role.toUpperCase() : 'Staff Member')}</span>
                </div>
              </div>

              <div className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 leading-relaxed font-normal">
                {item.remark || 'Status updated.'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
