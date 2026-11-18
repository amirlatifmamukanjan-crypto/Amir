import React, { useState } from 'react';
import { Cloud, Lock, LogIn, Moon, Sun, User } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { Role, SchoolDB } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginViewProps {
  db: SchoolDB;
  cloudUser: FirebaseUser | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogin: (role: Role, username: string, password: string) => boolean;
  onConnectCloud: () => Promise<void>;
  onDisconnectCloud: () => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  db,
  cloudUser,
  darkMode,
  onToggleDark,
  onLogin,
  onConnectCloud,
  onDisconnectCloud,
}) => {
  const [role, setRole] = useState<Role>('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const ok = onLogin(role, username.trim(), password);
    if (!ok) {
      setErrorMsg('Username ya password galat hai');
    }
  };

  const handleCloudClick = async () => {
    setConnecting(true);
    try {
      if (cloudUser) {
        await onDisconnectCloud();
      } else {
        await onConnectCloud();
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between p-4 sm:p-6 overflow-x-hidden">
      {/* Background campus photo with institutional dark scrim */}
      <div
        className="fixed inset-0 -z-10 bg-[#1b2f6b] bg-cover bg-center"
        style={{ backgroundImage: "url('/school-bg.jpg')" }}
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0b1f16]/60 via-[#0d1f3a]/70 to-[#07131e]/85" />

      {/* Top utility bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-white">
          <img
            src="/school-logo.png"
            alt={db.schoolName}
            className="w-9 h-9 rounded-lg object-contain bg-white/95 p-0.5 shrink-0"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">{db.schoolName}</p>
            <p className="text-xs text-white/75">{db.campus}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDark}
            className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <PWAInstallButton label="Install PC App" />
        </div>
      </header>

      {/* Centered authentication card */}
      <main className="w-full max-w-md mx-auto my-8">
        <div className="rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
          <div className="text-center space-y-2">
            <img
              src="/school-logo.png"
              alt={db.schoolName}
              className="w-20 h-20 mx-auto object-contain"
            />
            <h1 className="text-xl font-bold text-[#1b2f6b] dark:text-slate-100 tracking-tight">
              {db.schoolName}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {db.campus} &middot; Online &amp; Offline Attendance &amp; Fee Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-role"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                Account Role
              </label>
              <select
                id="login-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  setErrorMsg('');
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="login-user"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                {role === 'student' ? 'Roll Number' : 'Username'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'student' ? 'Enter Roll No' : 'Username / Roll No'}
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-pass"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
                />
              </div>
            </div>

            {errorMsg && (
              <p
                role="alert"
                className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
              >
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </form>

          {/* Optional Cloud Sync linking before login (for setting up a second PC) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Multi-PC Cloud Sync:
              </span>
              <button
                type="button"
                disabled={connecting}
                onClick={handleCloudClick}
                className="inline-flex items-center gap-1.5 font-medium text-[#1b2f6b] dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>
                  {cloudUser
                    ? `Synced (${cloudUser.email || 'Connected'}) · Disconnect`
                    : connecting
                    ? 'Connecting...'
                    : 'Connect Google Cloud'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 tabular-nums">
              Default &middot; Admin: <span className="font-mono">admin / admin123</span> &middot; Teacher:{' '}
              <span className="font-mono">t1 / 1234</span> &middot; Student:{' '}
              <span className="font-mono">1 / 1234</span>
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-white/75">
        {db.schoolName}, {db.campus} &middot; Works offline &amp; across multiple PCs
      </footer>
    </div>
  );
};
