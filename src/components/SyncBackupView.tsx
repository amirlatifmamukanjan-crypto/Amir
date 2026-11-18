import React, { useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  Cloud,
  CloudOff,
  Download,
  FileCode2,
  KeyRound,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { normalizeDB } from '../services/schoolStore';
import type { SchoolDB, SyncMode } from '../types';
import { exportJsonBackup, exportPortableOfflineHtml } from '../utils/exporters';
import { PWAInstallButton } from './PWAInstallButton';

interface SyncBackupViewProps {
  db: SchoolDB;
  cloudUser: FirebaseUser | null;
  syncMode: SyncMode;
  isOnline: boolean;
  onConnectCloud: () => Promise<void>;
  onDisconnectCloud: () => Promise<void>;
  onPushLocalToCloud: () => Promise<void>;
  onRestoreDB: (restored: SchoolDB) => Promise<void>;
  onChangeAdminPassword: (newPass: string) => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const SyncBackupView: React.FC<SyncBackupViewProps> = ({
  db,
  cloudUser,
  syncMode,
  isOnline,
  onConnectCloud,
  onDisconnectCloud,
  onPushLocalToCloud,
  onRestoreDB,
  onChangeAdminPassword,
  onNotify,
}) => {
  const [busy, setBusy] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [newAdminPass, setNewAdminPass] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed || !Array.isArray(parsed.students)) {
          throw new Error('Invalid format');
        }
        const normalized = normalizeDB(parsed);
        await onRestoreDB(normalized);
        onNotify('Backup restore ho gaya');
      } catch {
        onNotify('File sahi nahi hai', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handlePortableExport = async () => {
    setExportingHtml(true);
    try {
      await exportPortableOfflineHtml(db);
      onNotify('Portable offline PC file download ho gayi');
    } catch {
      onNotify('Portable file export nahi ho saki', 'error');
    } finally {
      setExportingHtml(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = newAdminPass.trim();
    if (p.length < 4) {
      onNotify('Kam az kam 4 characters ka password likhein', 'error');
      return;
    }
    await onChangeAdminPassword(p);
    setNewAdminPass('');
  };

  return (
    <div className="space-y-6">
      {/* Multi-PC Cloud Sync */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Multi-PC Real-Time Cloud Sync
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Sign in with the same School Google Account on any office or teacher PC. All
              students, teachers, daily attendance, and monthly fee records stay synced
              automatically — and offline changes queue locally until internet returns.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            Status:{' '}
            <span
              className={
                syncMode === 'synced'
                  ? 'text-[#0f7a3d] dark:text-emerald-400 font-semibold'
                  : syncMode === 'error'
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-amber-600 dark:text-amber-400 font-semibold'
              }
            >
              {syncMode === 'synced'
                ? 'Synced Online'
                : syncMode === 'syncing'
                ? 'Syncing...'
                : syncMode === 'offline-queued'
                ? 'Offline (Queued)'
                : syncMode === 'error'
                ? 'Sync Issue'
                : 'Local PC Only'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {cloudUser ? (
            <>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Connected: <strong>{cloudUser.email || cloudUser.displayName}</strong>
              </div>
              <button
                type="button"
                disabled={busy || !isOnline}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onPushLocalToCloud();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
                <span>Push Local Data to Cloud</span>
              </button>
              <button
                type="button"
                onClick={onDisconnectCloud}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CloudOff className="w-4 h-4" />
                <span>Disconnect Cloud</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConnectCloud();
                } finally {
                  setBusy(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1b2f6b] hover:bg-[#152454] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>Connect Google Cloud Sync</span>
            </button>
          )}
        </div>
      </section>

      {/* Run on Other PCs (Offline & Installable) */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Run on Other PCs (Offline Desktop Mode)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Install directly as a standalone Windows / Mac / Linux desktop app, or export a
            single portable HTML file that runs via USB on any offline computer without
            installation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PWAInstallButton label="Install PC Desktop App" />

          <button
            type="button"
            disabled={exportingHtml}
            onClick={handlePortableExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <FileCode2 className="w-4 h-4 text-[#1b2f6b] dark:text-blue-400" />
            <span>
              {exportingHtml
                ? 'Generating Portable File...'
                : 'Export Portable Offline PC File (.html)'}
            </span>
          </button>
        </div>
      </section>

      {/* JSON Backup & Restore + Admin Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Backup &amp; Restore (JSON)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Download complete school records or restore from an earlier backup file
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => exportJsonBackup(db)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Backup Download</span>
            </button>

            <input
              ref={restoreInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleRestoreFile}
            />
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Restore JSON File</span>
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Admin Login Security
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update the school administrator portal password
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[180px]">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="New admin password"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#1b2f6b] hover:bg-[#152454] px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
