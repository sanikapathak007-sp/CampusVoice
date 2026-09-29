import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sun,
  Moon,
  LogOut,
  Building2,
  GraduationCap,
  Shield,
  Layers,
  Menu,
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../types/database';

interface NavbarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onOpenConfig?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenConfig }) => {
  const { user, signOut, theme, toggleTheme, switchRole, isDemoMode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'principal':
        return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'hod':
        return <Shield className="w-4 h-4 text-indigo-500" />;
      case 'student':
      default:
        return <GraduationCap className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'principal':
        return 'Principal / Admin';
      case 'hod':
        return `HOD - ${user?.department || 'Dept'}`;
      case 'student':
      default:
        return 'Student';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Campus<span className="text-indigo-600 dark:text-indigo-400">Voice</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                  Smart Grievance Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                College Issue & Resolution System
              </p>
            </div>
          </div>

          {/* Center: Role Switcher for seamless testing */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => switchRole('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                user?.role === 'student'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student Portal
            </button>
            <button
              onClick={() => switchRole('hod')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                user?.role === 'hod'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              HOD Portal
            </button>
            <button
              onClick={() => switchRole('principal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                user?.role === 'principal'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Principal Portal
            </button>
          </div>

          {/* Right Navigation & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Database status button */}
            <button
              onClick={onOpenConfig}
              title={isDemoMode ? 'Running in Test / Demo Mode' : 'Connected to Supabase'}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isDemoMode ? 'Demo Store' : 'Supabase Active'}</span>
              {isDemoMode ? (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* User Profile Info */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {getRoleIcon(user.role)}
                    <span className="truncate max-w-[110px]">{getRoleLabel(user.role)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Out Button */}
            {user && (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
          {user && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as:</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.name}</p>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                {getRoleIcon(user.role)} {getRoleLabel(user.role)}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Switch Portal Role</p>
            <button
              onClick={() => {
                switchRole('student');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                user?.role === 'student'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Student Portal
            </button>
            <button
              onClick={() => {
                switchRole('hod');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                user?.role === 'hod'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <Shield className="w-4 h-4" /> HOD Portal
            </button>
            <button
              onClick={() => {
                switchRole('principal');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                user?.role === 'principal'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4" /> Principal Portal
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                if (onOpenConfig) onOpenConfig();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" /> Database Settings
            </button>

            <button
              onClick={() => {
                signOut();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
