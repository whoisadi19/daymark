import React, { useState, useEffect } from 'react';
import { CalibrationData } from '../hooks/useDeskTimer';
import { formatSecondsToDigital } from '../db/db';
import { X } from 'lucide-react';

interface CalibrationModalProps {
  data: CalibrationData;
  onCommit: (focusedSec: number, distractedSec: number) => void;
  onCancel: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  data,
  onCommit,
  onCancel,
}) => {
  const totalSeconds = Math.max(1, Math.round(data.totalMs / 1000));
  const initialRatio = data.totalMs > 0 ? (data.initialFocusedMs / data.totalMs) * 100 : 50;

  const [focusedPercent, setFocusedPercent] = useState<number>(Math.round(initialRatio));

  const calibratedFocusedSec = Math.round((focusedPercent / 100) * totalSeconds);
  const calibratedDistractedSec = totalSeconds - calibratedFocusedSec;

  const handleCommit = () => {
    onCommit(calibratedFocusedSec, calibratedDistractedSec);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        handleCommit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calibratedFocusedSec, calibratedDistractedSec, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#FAF9F6] border border-[#DCD9D0] shadow-xl rounded-2xl p-6 text-[#111110] relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base text-[#111110]">
            Session Calibration
          </h3>
          <button
            onClick={onCancel}
            className="text-[#9E9B93] hover:text-[#111110] p-1 rounded-md"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[#686660] mb-5 leading-relaxed">
          Session duration: <strong className="text-[#111110] font-mono">{formatSecondsToDigital(totalSeconds, false)}</strong>. Adjust the split if you stepped away or forgot to toggle:
        </p>

        {/* Recessed Split Well */}
        <div className="bg-[#F2F0EA] border border-[#E5E2D9] rounded-xl p-4 mb-5 space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#E5391A] font-medium">
              Focused: {formatSecondsToDigital(calibratedFocusedSec, false)} ({focusedPercent}%)
            </span>
            <span className="text-[#D97706] font-medium">
              Distracted: {formatSecondsToDigital(calibratedDistractedSec, false)} ({100 - focusedPercent}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#E5E2D9]">
            <div
              className="h-full bg-[#E5391A] transition-all duration-75"
              style={{ width: `${focusedPercent}%` }}
            />
            <div
              className="h-full bg-[#D97706] transition-all duration-75"
              style={{ width: `${100 - focusedPercent}%` }}
            />
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={focusedPercent}
            onChange={(e) => setFocusedPercent(Number(e.target.value))}
            className="w-full h-1.5 bg-[#E5E2D9] accent-[#111110] cursor-pointer rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-[#9E9B93] font-mono">
            <span>All Distracted</span>
            <span>Balanced</span>
            <span>All Focused</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs text-[#686660] hover:text-[#111110] font-medium transition-colors"
          >
            Resume Session
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="px-4 py-2 text-xs bg-[#111110] hover:bg-[#272725] text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            Commit to Log
          </button>
        </div>
      </div>
    </div>
  );
};
