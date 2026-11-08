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

  return (
    <>
      <section
        className={`bg-[#FAF9F6] border rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors ${
          isClockedIn
            ? isFocused
              ? 'border-[#E5391A]'
              : 'border-[#D97706]'
            : 'border-[#DCD9D0]'
        }`}
      >
        {/* Header Row: Label + Live Efficiency Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isClockedIn
                  ? isFocused
                    ? 'bg-[#E5391A] animate-pulse'
                    : 'bg-[#D97706] animate-pulse'
                  : 'bg-[#9E9B93]'
              }`}
            />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#686660] font-medium">
              Desk Telemetry
            </span>
          </div>

          <div className="bg-[#F2F0EA] px-2.5 py-1 rounded-full text-xs font-mono font-medium text-[#111110]">
            {totalDayAtDeskSec > 0 ? `${deskEfficiencyPercent}% EFFICIENCY` : '0% EFFICIENCY'}
          </div>
        </div>

        {/* Hero Counter: AT DESK single massive typographic centerpiece */}
        <div className="my-5">
          <span className="block text-[11px] font-mono uppercase tracking-wider text-[#686660] mb-1">
            At Desk Total
          </span>
          <div className="text-6xl font-semibold tracking-[-0.04em] tabular-nums text-[#111110]">
            {formatSecondsToDigital(totalDayAtDeskSec)}
          </div>
        </div>

        {/* Split Metric Wells (Focused & Distracted) */}
        <div className="grid grid-cols-2 gap-2.5 my-5">
          {/* Left Well: Focused */}
          <div
            onClick={() => {
              if (isClockedIn && !isFocused) toggleState();
            }}
            className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
              isClockedIn && isFocused
                ? 'bg-[#FFF5F2] border-[#E5391A]/40 shadow-sm'
                : 'bg-[#F2F0EA] border-transparent hover:border-[#DCD9D0]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5391A]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#686660] font-medium">
                Focused
              </span>
            </div>
            <div
              className={`text-2xl font-semibold tracking-tight tabular-nums ${
                isClockedIn && isFocused ? 'text-[#E5391A]' : 'text-[#111110]'
              }`}
            >
              {formatSecondsToDigital(totalDayFocusedSec)}
            </div>
          </div>

          {/* Right Well: Distracted */}
          <div
            onClick={() => {
              if (isClockedIn && isFocused) toggleState();
            }}
            className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
              isClockedIn && !isFocused
                ? 'bg-[#FFFBEB] border-[#D97706]/40 shadow-sm'
                : 'bg-[#F2F0EA] border-transparent hover:border-[#DCD9D0]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#686660] font-medium">
                Distracted
              </span>
            </div>
            <div
              className={`text-2xl font-semibold tracking-tight tabular-nums ${
                isClockedIn && !isFocused ? 'text-[#D97706]' : 'text-[#686660]'
              }`}
            >
              {formatSecondsToDigital(totalDayDistractedSec)}
            </div>
          </div>
        </div>

        {/* Bottom Action Row */}
        <div>
          {!isClockedIn ? (
            <button
              onClick={clockIn}
              className="w-full h-11 rounded-xl bg-[#111110] text-white hover:bg-[#272725] active:scale-[0.99] font-medium text-sm flex items-center justify-center gap-2 transition"
            >
              <Play size={14} fill="currentColor" />
              <span>Start Desk Session</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleState}
                className={`flex-1 h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-sm ${
                  isFocused
                    ? 'bg-[#E5391A] hover:bg-[#D43417] text-white'
                    : 'bg-[#D97706] hover:bg-[#C26A05] text-white'
                }`}
              >
                <span>{isFocused ? 'Currently Focused' : 'Currently Drifting'}</span>
                <span className="text-xs opacity-75 font-mono">· Space to flip</span>
              </button>

              <button
                onClick={requestClockOut}
                className="h-11 px-4 rounded-xl bg-[#F2F0EA] hover:bg-[#EAE7DF] text-[#111110] font-medium text-sm border border-[#DCD9D0] transition shrink-0"
              >
                End Session
              </button>
            </div>
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
