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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#161618]/95 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9)] rounded-[32px] p-7 text-white relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D71921]" />
            Session Calibration
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            title="Cancel"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-white/60 mb-6 leading-relaxed">
          Session duration: <strong className="text-white font-ndot text-sm">{formatSecondsToDigital(totalSeconds, false)}</strong>. Adjust the split if you stepped away or forgot to toggle:
        </p>

        {/* Recessed Split Well */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-6 space-y-3.5">
          <div className="flex justify-between items-center text-xs font-ndot">
            <span className="text-[#D71921] font-bold">
              FOCUSED: {formatSecondsToDigital(calibratedFocusedSec, false)} ({focusedPercent}%)
            </span>
            <span className="text-white/60 font-medium">
              DRIFT: {formatSecondsToDigital(calibratedDistractedSec, false)} ({100 - focusedPercent}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/10">
            <div
              className="h-full bg-[#D71921] transition-all duration-75 shadow-[0_0_10px_#D71921]"
              style={{ width: `${focusedPercent}%` }}
            />
            <div
              className="h-full bg-white/30 transition-all duration-75"
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
            className="w-full h-1.5 bg-white/15 accent-[#D71921] cursor-pointer rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-white/40 font-ndot">
            <span>ALL DISTRACTED</span>
            <span>BALANCED</span>
            <span>ALL FOCUSED</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs text-white/60 hover:text-white font-medium transition-colors"
          >
            Resume Session
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="px-5 py-2.5 text-xs bg-[#ECECEF] hover:bg-white text-[#0A0A0C] font-semibold rounded-full transition-all active:scale-95 shadow-md"
          >
            Commit to Log
          </button>
        </div>
      </div>
    </div>
  );
};
