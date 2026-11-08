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
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#686660] hover:text-[#111110] hover:bg-[#F2F0EA] transition-colors"
        title="Settings & Tools"
        aria-label="Settings"
      >
        <Settings size={15} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-[#FAF9F6] border border-[#DCD9D0] shadow-xl rounded-2xl py-2 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#DCD9D0] text-[#686660]">
            <span className="font-semibold text-xs text-[#111110]">Settings & Data</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#9E9B93] hover:text-[#111110]"
            >
              <X size={13} />
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F2F0EA] text-[#111110] transition-colors"
            >
              <span className="flex items-center gap-2">
                {soundEnabled ? <Volume2 size={13} className="text-[#111110]" /> : <VolumeX size={13} className="text-[#9E9B93]" />}
                <span>Sound Feedback</span>
              </span>
              <span className="text-[10px] text-[#686660] font-mono">{soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={handleBackup}
              className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-[#F2F0EA] text-[#111110] transition-colors"
            >
              <Download size={13} className="text-[#686660]" />
              <span>Backup Data (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-[#F2F0EA] text-[#111110] transition-colors"
            >
              <Upload size={13} className="text-[#686660]" />
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

          <div className="border-t border-[#DCD9D0] py-1">
            <button
              onClick={handleSeed}
              className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-[#F2F0EA] text-[#111110] transition-colors"
            >
              <RefreshCw size={13} className="text-[#686660]" />
              <span>Seed 7-Day Demo Data</span>
            </button>

            <button
              onClick={handleClear}
              className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-[#FFF5F2] text-[#E5391A] transition-colors"
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
