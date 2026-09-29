import React from 'react';
import { Priority } from '../types/database';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5 font-medium',
  };

  switch (priority) {
    case 'Critical':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900 ${sizeClasses[size]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
          Critical
        </span>
      );
    case 'High':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-orange-50 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-200 dark:border-orange-800 ${sizeClasses[size]}`}
        >
          High
        </span>
      );
    case 'Medium':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${sizeClasses[size]}`}
        >
          Medium
        </span>
      );
    case 'Low':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${sizeClasses[size]}`}
        >
          Low
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 ${sizeClasses[size]}`}>
          {priority}
        </span>
      );
  }
};
