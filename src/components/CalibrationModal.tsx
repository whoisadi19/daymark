import React, { useState } from 'react';
import { CalibrationData } from '../hooks/useDeskTimer';
import { formatSecondsToDigital } from '../db/db';
import { Check, X } from 'lucide-react';

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

  // Percentage focused (0 - 100)
  const [focusedPercent, setFocusedPercent] = useState<number>(Math.round(initialRatio));

  const calibratedFocusedSec = Math.round((focusedPercent / 100) * totalSeconds);
  const calibratedDistractedSec = totalSeconds - calibratedFocusedSec;

  const handleCommit = () => {
    onCommit(calibratedFocusedSec, calibratedDistractedSec);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-none p-4">
      <div className="w-full max-w-xl bg-panel border-2 border-text-ink shadow-2xl p-6 text-text-ink relative">
        {/* Monospace Stamped Header */}
        <div className="flex items-center justify-between border-plate-b pb-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-braun-orange inline-block"></span>
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              CALIBRATION // FORGOT-TO-TOGGLE RECOVERY
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-text-dim hover:text-text-ink p-1 font-mono text-xs"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Description */}
        <div className="mb-6 space-y-1">
          <p className="font-serif text-2xl text-text-ink font-semibold">
            Desk Session Elapsed: {formatSecondsToDigital(totalSeconds, false)}
          </p>
          <p className="text-xs text-text-dim leading-relaxed">
            Adjust actual focused vs. distracted split if you forgot to toggle the rocker switch while away or working:
          </p>
        </div>

        {/* Range Slider Plate */}
        <div className="bg-canvas border-plate p-5 mb-6 space-y-4">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-braun-orange font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-braun-orange inline-block"></span>
              FOCUSED: {formatSecondsToDigital(calibratedFocusedSec, false)} ({focusedPercent}%)
            </span>
            <span className="text-ochre-amber font-bold flex items-center gap-1.5">
              DISTRACTED: {formatSecondsToDigital(calibratedDistractedSec, false)} ({100 - focusedPercent}%)
              <span className="w-2 h-2 bg-ochre-amber inline-block"></span>
            </span>
          </div>

          {/* Dual Segment Preview Bar */}
          <div className="w-full h-4 bg-ink flex p-0.5 gap-0.5 border border-grid-line">
            <div
              className="h-full bg-braun-orange transition-all duration-75"
              style={{ width: `${focusedPercent}%` }}
            />
            <div
              className="h-full bg-ochre-amber transition-all duration-75"
              style={{ width: `${100 - focusedPercent}%` }}
            />
          </div>

          {/* Tactile Range Input */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={focusedPercent}
            onChange={(e) => setFocusedPercent(Number(e.target.value))}
            className="w-full h-2 bg-panel accent-braun-orange cursor-pointer border border-grid-line"
          />

          <div className="flex justify-between text-[10px] font-mono text-text-dim uppercase tracking-wider">
            <span>100% Distracted</span>
            <span>50 / 50</span>
            <span>100% Focused</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-mechanical px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <X size={14} />
            <span>RESUME SESSION</span>
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="btn-mechanical-orange px-5 py-2 text-xs flex items-center gap-2 font-bold"
          >
            <Check size={14} />
            <span>COMMIT TO LOG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
