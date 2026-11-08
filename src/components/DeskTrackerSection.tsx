import React from 'react';
import { useDeskTimer } from '../hooks/useDeskTimer';
import { formatSecondsToDigital } from '../db/db';
import { CalibrationModal } from './CalibrationModal';
import { Play } from 'lucide-react';

interface DeskTrackerSectionProps {
  selectedDateKey: string;
}

export const DeskTrackerSection: React.FC<DeskTrackerSectionProps> = ({ selectedDateKey }) => {
  const {
    isClockedIn,
    currentState,
    totalDayFocusedSec,
    totalDayDistractedSec,
    totalDayAtDeskSec,
    deskEfficiencyPercent,
    clockIn,
    toggleState,
    requestClockOut,
    commitSession,
    cancelClockOut,
    showCalibrationModal,
    calibrationData,
  } = useDeskTimer(selectedDateKey);

  const isFocused = currentState === 'focused';

  // Calculate efficiency bar width
  const focusedRatio = totalDayAtDeskSec > 0 ? (totalDayFocusedSec / totalDayAtDeskSec) * 100 : 0;
  const distractedRatio = totalDayAtDeskSec > 0 ? (totalDayDistractedSec / totalDayAtDeskSec) * 100 : 0;

  return (
    <>
      <section className="relative overflow-hidden rounded-xl bg-[#161615] text-[#F7F6F2] p-6 shadow-sm">
        {/* Main Row: 3 Clean Numbers (Left) + Integrated Controls (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
          {/* Numbers Side-by-Side */}
          <div className="grid grid-cols-3 gap-6 sm:gap-10">
            {/* Metric 1: At Desk */}
            <div>
              <span className="block text-[11px] font-medium tracking-wider text-[#8A8780] uppercase mb-1">
                At Desk
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-light tracking-tight text-[#F7F6F2] tabular-nums">
                {formatSecondsToDigital(totalDayAtDeskSec)}
              </div>
            </div>

            {/* Metric 2: Focused */}
            <div>
              <span className="block text-[11px] font-medium tracking-wider text-[#8A8780] uppercase mb-1">
                Focused
              </span>
              <div
                className={`font-mono text-2xl sm:text-3xl font-light tracking-tight tabular-nums transition-colors ${
                  isClockedIn && isFocused ? 'text-[#E04F33] font-normal' : 'text-[#F7F6F2]'
                }`}
              >
                {formatSecondsToDigital(totalDayFocusedSec)}
              </div>
            </div>

            {/* Metric 3: Distracted */}
            <div>
              <span className="block text-[11px] font-medium tracking-wider text-[#8A8780] uppercase mb-1">
                Distracted
              </span>
              <div
                className={`font-mono text-2xl sm:text-3xl font-light tracking-tight tabular-nums transition-colors ${
                  isClockedIn && !isFocused ? 'text-[#D99B26] font-normal' : 'text-[#8A8780]'
                }`}
              >
                {formatSecondsToDigital(totalDayDistractedSec)}
              </div>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            {!isClockedIn ? (
              <button
                onClick={clockIn}
                className="flex items-center gap-2 bg-[#F7F6F2] hover:bg-white text-[#161615] text-xs font-medium px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
              >
                <Play size={13} fill="currentColor" />
                <span>Start Desk Session</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                {/* Sleek Pill Toggle (Focused | Distracted) */}
                <div className="flex items-center bg-[#252523] p-1 rounded-lg border border-[#333330]">
                  <button
                    onClick={() => {
                      if (!isFocused) toggleState();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      isFocused
                        ? 'bg-[#E04F33] text-white shadow-sm'
                        : 'text-[#8A8780] hover:text-[#F7F6F2]'
                    }`}
                  >
                    Focused
                  </button>
                  <button
                    onClick={() => {
                      if (isFocused) toggleState();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      !isFocused
                        ? 'bg-[#D99B26] text-white shadow-sm'
                        : 'text-[#8A8780] hover:text-[#F7F6F2]'
                    }`}
                  >
                    Distracted
                  </button>
                </div>

                {/* Subtle Space Key Hint & End Button */}
                <button
                  onClick={requestClockOut}
                  className="px-3 py-1.5 text-xs font-medium text-[#8A8780] hover:text-[#F7F6F2] hover:bg-[#252523] rounded-lg transition-colors"
                  title="Finish desk session"
                >
                  End
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Efficiency Tag (Inline Right above progress line) */}
        {totalDayAtDeskSec > 0 && (
          <div className="flex justify-between items-center text-[11px] text-[#8A8780] pt-2 mb-1">
            <span>Desk Efficiency: <strong className="text-[#F7F6F2] font-mono">{deskEfficiencyPercent}%</strong></span>
            <span className="hidden sm:inline text-[10px] text-[#63615C]">Press Space to switch focus</span>
          </div>
        )}

        {/* Bottom edge: Thin 3px Progress Line showing live Desk Efficiency ratio */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#252523] flex overflow-hidden">
          {totalDayAtDeskSec > 0 ? (
            <>
              <div
                className="h-full bg-[#E04F33] transition-all duration-300"
                style={{ width: `${focusedRatio}%` }}
                title={`Focused: ${Math.round(focusedRatio)}%`}
              />
              <div
                className="h-full bg-[#D99B26] transition-all duration-300"
                style={{ width: `${distractedRatio}%` }}
                title={`Distracted: ${Math.round(distractedRatio)}%`}
              />
            </>
          ) : (
            <div className="h-full w-full bg-[#20201E]" />
          )}
        </div>
      </section>

      {/* Calibration Modal */}
      {showCalibrationModal && calibrationData && (
        <CalibrationModal
          data={calibrationData}
          onCommit={commitSession}
          onCancel={cancelClockOut}
        />
      )}
    </>
  );
};
