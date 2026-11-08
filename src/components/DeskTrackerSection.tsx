import React from 'react';
import { useDeskTimer, UseDeskTimerReturn } from '../hooks/useDeskTimer';
import { formatSecondsToDigital } from '../db/db';
import { CalibrationModal } from './CalibrationModal';
import { Play, Square, Zap, Coffee } from 'lucide-react';

interface DeskTrackerSectionProps {
  selectedDateKey: string;
  timer?: UseDeskTimerReturn;
}

export const DeskTrackerSection: React.FC<DeskTrackerSectionProps> = ({
  selectedDateKey,
  timer: externalTimer,
}) => {
  const localTimer = useDeskTimer(selectedDateKey);
  const activeTimer = externalTimer || localTimer;

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
  } = activeTimer;

  const isFocused = currentState === 'focused';

  return (
    <>
      <section className="max-w-[560px] mx-auto w-full my-auto flex flex-col gap-4 animate-in fade-in duration-200">
        {/* 1. Main Hero Widget (Time at Desk - Large Smoked Glass Squircle) */}
        <div className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[32px] p-7 sm:p-8 text-white relative overflow-hidden">
          {/* Subtle Ambient Red Flare inside Card when active */}
          {isClockedIn && (
            <div
              className={`absolute -top-14 -right-14 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                isFocused ? 'bg-[#D71921]/30' : 'bg-amber-500/20'
              }`}
            />
          )}

          {/* Top Row: Label & Efficiency Pill */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-ndot uppercase tracking-widest text-white/50 font-bold flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isClockedIn
                    ? isFocused
                      ? 'bg-[#D71921] shadow-[0_0_8px_#D71921] animate-pulse'
                      : 'bg-amber-400 shadow-[0_0_8px_#FBBF24] animate-pulse'
                    : 'bg-white/20'
                }`}
              />
              TIME AT DESK
            </span>

            <div className="bg-white/[0.08] border border-white/10 px-3 py-1 rounded-full text-xs font-ndot font-medium text-white">
              {totalDayAtDeskSec > 0 ? `${deskEfficiencyPercent}% EFFICIENCY` : '0% EFFICIENCY'}
            </div>
          </div>

          {/* Center: Massive NDot Dot-Matrix Digits */}
          <div className="my-6 sm:my-8 text-center relative z-10">
            <div className="font-ndot text-6xl sm:text-7xl tracking-wider text-white tabular-nums drop-shadow-md">
              {formatSecondsToDigital(totalDayAtDeskSec)}
            </div>
          </div>

          {/* Bottom subtle progress line */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            {totalDayAtDeskSec > 0 ? (
              <>
                <div
                  className="h-full bg-[#D71921] transition-all duration-300"
                  style={{ width: `${(totalDayFocusedSec / totalDayAtDeskSec) * 100}%` }}
                />
                <div
                  className="h-full bg-white/20 transition-all duration-300"
                  style={{ width: `${(totalDayDistractedSec / totalDayAtDeskSec) * 100}%` }}
                />
              </>
            ) : (
              <div className="h-full w-full bg-white/5" />
            )}
          </div>
        </div>

        {/* 2. Middle 2-Column Widget Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Square Widget: Focused Hours */}
          <div
            onClick={() => {
              if (isClockedIn && !isFocused) toggleState();
            }}
            className={`rounded-[28px] p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between min-h-[140px] relative overflow-hidden ${
              isClockedIn && isFocused
                ? 'bg-[#D71921] text-white border border-[#FF4D54]/30 shadow-[0_12px_30px_rgba(215,25,33,0.35)] scale-[1.02]'
                : 'bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white/70 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-ndot uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-90">
                <Zap size={12} />
                FOCUSED
              </span>
              {isClockedIn && isFocused && (
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#FFF] animate-pulse" />
              )}
            </div>

            <div className="font-ndot text-3xl sm:text-4xl tracking-wider text-white tabular-nums my-1">
              {formatSecondsToDigital(totalDayFocusedSec)}
            </div>

            <span className="text-[10px] font-ndot opacity-60 uppercase">
              {isClockedIn && isFocused ? 'ACTIVE STATE' : 'TAP TO FOCUS'}
            </span>
          </div>

          {/* Right Square Widget: Distracted Hours */}
          <div
            onClick={() => {
              if (isClockedIn && isFocused) toggleState();
            }}
            className={`rounded-[28px] p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between min-h-[140px] relative overflow-hidden ${
              isClockedIn && !isFocused
                ? 'bg-[#1E1A16] text-amber-200 border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.2)] scale-[1.02]'
                : 'bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white/70 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-ndot uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-90">
                <Coffee size={12} />
                DISTRACTED
              </span>
              {isClockedIn && !isFocused && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24] animate-pulse" />
              )}
            </div>

            <div className="font-ndot text-3xl sm:text-4xl tracking-wider text-white tabular-nums my-1">
              {formatSecondsToDigital(totalDayDistractedSec)}
            </div>

            <span className="text-[10px] font-ndot opacity-60 uppercase">
              {isClockedIn && !isFocused ? 'ACTIVE STATE' : 'TAP TO DRIFT'}
            </span>
          </div>
        </div>

        {/* 3. Bottom Pill Controls */}
        <div className="flex items-center gap-3 pt-2">
          {!isClockedIn ? (
            <button
              onClick={clockIn}
              className="flex-1 h-14 rounded-full bg-[#ECECEF] hover:bg-white text-[#0A0A0C] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition active:scale-[0.98]"
            >
              <Play size={16} fill="currentColor" />
              <span>Start Desk Session</span>
            </button>
          ) : (
            <>
              {/* High-Contrast Ivory Pill Button (Toggle Focus/Drift via Spacebar) */}
              <button
                onClick={toggleState}
                className="flex-1 h-14 rounded-full bg-[#ECECEF] hover:bg-white text-[#0A0A0C] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition active:scale-[0.98]"
              >
                <span>{isFocused ? 'Switch to Distracted' : 'Switch to Focused'}</span>
                <span className="text-[10px] font-ndot bg-[#0A0A0C]/10 px-2 py-0.5 rounded-full uppercase">
                  Space
                </span>
              </button>

              {/* Circular Crimson Stop Button */}
              <button
                onClick={requestClockOut}
                className="w-14 h-14 rounded-full bg-[#D71921] hover:bg-[#C0151D] flex items-center justify-center text-white shrink-0 shadow-[0_12px_30px_rgba(215,25,33,0.35)] transition active:scale-95"
                title="Stop & Calibrate Session"
              >
                <Square size={16} fill="currentColor" />
              </button>
            </>
          )}
        </div>
      </section>

      {/* Nothing OS Frosted Calibration Modal */}
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
