import React, { useEffect } from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const shortcuts = [
    { key: '1', desc: 'Switch to 01 · Reflection tab' },
    { key: '2', desc: 'Switch to 02 · Tracker tab' },
    { key: '3', desc: 'Switch to 03 · Analytics tab' },
    { key: 'Space', desc: 'Flip between Focus & Distracted modes (when clocked in)' },
    { key: 'Enter', desc: 'Add task to checklist / Commit calibration' },
    { key: '?', desc: 'Toggle keyboard shortcuts menu' },
    { key: 'Esc', desc: 'Close any active dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#161618]/95 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9)] rounded-[32px] p-6 text-white relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Command size={15} className="text-[#D71921]" />
            <h3 className="font-semibold text-sm text-white">Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="my-4 space-y-2.5">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between text-xs py-1">
              <span className="text-white/60">{sc.desc}</span>
              <kbd className="font-ndot text-[11px] bg-white/10 border border-white/15 px-2 py-0.5 rounded-lg text-white font-bold tracking-wider">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white/10 hover:bg-white/15 rounded-full text-xs font-medium text-white/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

