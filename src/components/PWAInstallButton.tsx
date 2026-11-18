import React, { useState } from 'react';
import { Download, Monitor, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'outline';
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'primary',
  label = 'Install PC App',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const baseClass =
    variant === 'primary'
      ? 'inline-flex items-center gap-2 rounded-lg bg-[#0f7a3d] px-4 py-2 text-sm font-medium text-white hover:bg-[#0c6532] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
      : 'inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={baseClass}>
        {isInstallable ? (
          <Download className="w-4 h-4 shrink-0" />
        ) : (
          <Monitor className="w-4 h-4 shrink-0" />
        )}
        <span>{isIOS ? 'Install on iPhone / iPad' : label}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3
                id="install-guide-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {isIOS
                  ? 'Install on iPhone / iPad'
                  : 'Install Software on Windows / Mac / Linux'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5">
                <li>
                  Tap the <strong>Share</strong> button in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  This software works <strong>100% offline</strong> after installation on
                  any PC:
                </p>
                <ol className="space-y-2 list-decimal pl-5">
                  <li>
                    Open this app directly in <strong>Google Chrome</strong> or{' '}
                    <strong>Microsoft Edge</strong> (outside embedded preview frames).
                  </li>
                  <li>
                    Click the <strong>Install icon</strong> in the top-right address bar
                    (or Menu &rarr; <em>Install Ayesha Amir Nursing School</em>).
                  </li>
                  <li>
                    It will create a Desktop &amp; Start Menu shortcut and run in its own
                    window without internet.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full rounded-lg bg-[#1b2f6b] py-2 text-sm font-medium text-white hover:bg-[#152454] transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
