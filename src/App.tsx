import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { StudentPortal } from './pages/StudentPortal';
import { HodPortal } from './pages/HodPortal';
import { PrincipalPortal } from './pages/PrincipalPortal';
import { ConfigModal } from './components/ConfigModal';
import { RefreshCw } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [configModalOpen, setConfigModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Initializing CampusVoice...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar onOpenConfig={() => setConfigModalOpen(true)} />

      {/* Main View Router */}
      <main className="flex-1 pb-12">
        {!user ? (
          <LoginPage />
        ) : user.role === 'principal' ? (
          <PrincipalPortal />
        ) : user.role === 'hod' ? (
          <HodPortal />
        ) : (
          <StudentPortal />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} CampusVoice - Smart College Issue & Grievance Management System</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Role-Based Access Control</span>
            <span>•</span>
            <span>Gemini AI Triage</span>
            <span>•</span>
            <button
              onClick={() => setConfigModalOpen(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Database Credentials
            </button>
          </div>
        </div>
      </footer>

      {/* Supabase & Credentials Config Modal */}
      <ConfigModal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
