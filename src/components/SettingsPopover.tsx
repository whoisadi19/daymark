import React, { useState, useRef, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Download, Upload, RefreshCw, Trash2, X } from 'lucide-react';
import { exportDatabaseToJson, importDatabaseFromJson, seedRealisticDemoTelemetry, clearAllTelemetryData } from '../db/db';
import { soundEngine } from '../utils/audio';

interface SettingsPopoverProps {
  selectedDateKey: string;
  onDataRefresh: () => void;
}

export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  selectedDateKey,
  onDataRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.isEnabled());
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundEngine.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) soundEngine.playKeyClick();
  };

  const handleBackup = async () => {
    const jsonStr = await exportDatabaseToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daymark-backup-${selectedDateKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const success = await importDatabaseFromJson(text);
        if (success) {
          onDataRefresh();
        } else {
          alert('Invalid backup file.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsOpen(false);
  };

  const handleSeed = async () => {
    if (window.confirm('Seed 7 days of realistic demo telemetry? This will replace current local database.')) {
      await seedRealisticDemoTelemetry();
      onDataRefresh();
      setIsOpen(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all local data and reset to empty state?')) {
      await clearAllTelemetryData();
      onDataRefresh();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-black/5 transition-colors"
        title="Settings & Tools"
        aria-label="Settings"
      >
        <Settings size={15} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-divider shadow-lg rounded-lg py-1.5 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-divider/60 text-muted">
            <span className="font-medium text-[11px] tracking-normal">Preferences & Data</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted hover:text-ink"
            >
              <X size={12} />
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 text-ink transition-colors"
            >
              <span className="flex items-center gap-2">
                {soundEnabled ? <Volume2 size={13} className="text-ink" /> : <VolumeX size={13} className="text-muted" />}
                <span>Sound Feedback</span>
              </span>
              <span className="text-[10px] text-muted font-mono">{soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={handleBackup}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-ink transition-colors"
            >
              <Download size={13} className="text-muted" />
              <span>Backup Data (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-ink transition-colors"
            >
              <Upload size={13} className="text-muted" />
              <span>Restore Data (.json)</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="border-t border-divider/60 py-1">
            <button
              onClick={handleSeed}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 text-ink transition-colors"
            >
              <RefreshCw size={13} className="text-muted" />
              <span>Seed 7-Day Demo Data</span>
            </button>

            <button
              onClick={handleClear}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 size={13} />
              <span>Reset All Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

