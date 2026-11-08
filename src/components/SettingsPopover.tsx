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
        className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all backdrop-blur-xl"
        title="Settings & Tools"
        aria-label="Settings"
      >
        <Settings size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-[#161618]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-2 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-white/60">
            <span className="font-semibold text-xs text-white">NOTHING OS // TOOLS</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] text-white/90 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                {soundEnabled ? <Volume2 size={14} className="text-[#D71921]" /> : <VolumeX size={14} className="text-white/40" />}
                <span>Haptic Audio</span>
              </span>
              <span className="text-[10px] text-white/40 font-ndot">{soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={handleBackup}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-white/90 transition-colors"
            >
              <Download size={14} className="text-white/50" />
              <span>Backup JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-white/90 transition-colors"
            >
              <Upload size={14} className="text-white/50" />
              <span>Restore JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="border-t border-white/10 pt-1">
            <button
              onClick={handleSeed}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-white/90 transition-colors"
            >
              <RefreshCw size={14} className="text-white/50" />
              <span>Seed 7D Demo Telemetry</span>
            </button>

            <button
              onClick={handleClear}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#D71921]/15 text-[#D71921] transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
