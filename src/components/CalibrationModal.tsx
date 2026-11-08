import React, { useState } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-divider shadow-xl rounded-xl p-6 text-ink relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-ink">
            Session Calibration
          </h3>
          <button
            onClick={onCancel}
            className="text-muted hover:text-ink p-1 rounded-md"
            title="Cancel"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-muted mb-6 leading-relaxed">
          Session duration: <strong className="text-ink font-mono">{formatSecondsToDigital(totalSeconds, false)}</strong>. Adjust the split if you stepped away or forgot to toggle:
        </p>

        {/* Clean Split Readout */}
        <div className="bg-[#F7F6F2] rounded-lg p-4 mb-6 space-y-3 border border-divider">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-vermilion font-medium">
              Focused: {formatSecondsToDigital(calibratedFocusedSec, false)} ({focusedPercent}%)
            </span>
            <span className="text-amber font-medium">
              Distracted: {formatSecondsToDigital(calibratedDistractedSec, false)} ({100 - focusedPercent}%)
            </span>
          </div>

          {/* Visual Dual Bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-divider">
            <div
              className="h-full bg-vermilion transition-all duration-75"
              style={{ width: `${focusedPercent}%` }}
            />
            <div
              className="h-full bg-amber transition-all duration-75"
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
            className="w-full h-1.5 bg-divider accent-ink cursor-pointer rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-muted font-mono">
            <span>All Distracted</span>
            <span>Balanced</span>
            <span>All Focused</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs text-muted hover:text-ink font-medium transition-colors"
          >
            Resume Session
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="px-4 py-2 text-xs bg-ink hover:bg-black text-white font-medium rounded-lg transition-colors"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
};
