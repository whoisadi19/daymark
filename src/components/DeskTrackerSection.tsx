import React from 'react';
import { useDeskTimer } from '../hooks/useDeskTimer';
import { formatSecondsToDigital } from '../db/db';
import { CalibrationModal } from './CalibrationModal';
import { Laptop, Zap, Coffee, Power } from 'lucide-react';

interface DeskTrackerSectionProps {
  selectedDateKey: string;
}

export const DeskTrackerSection: React.FC<DeskTrackerSectionProps> = ({ selectedDateKey }) => {
  const {
    isClockedIn,
    currentState,
    currentSessionFocusedSec,
    currentSessionDistractedSec,
    currentSessionTotalSec,
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

  // 20-segment LED bar calculation for today's ratio
  // Number of focused segments vs distracted segments out of 20
  const TOTAL_SEGMENTS = 20;
  let focusedSegments = 0;
  let distractedSegments = 0;

  if (totalDayAtDeskSec > 0) {
    const focusedRatio = totalDayFocusedSec / totalDayAtDeskSec;
    focusedSegments = Math.round(focusedRatio * TOTAL_SEGMENTS);
    distractedSegments = TOTAL_SEGMENTS - focusedSegments;
  }

  const isFocused = currentState === 'focused';

  return (
    <>
      <section className="bg-ink border-plate text-[#F4F1EA] relative flex flex-col overflow-hidden">
        {/* Monospace Stamped Plate Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#2C2C2A] bg-[#181817] px-4 py-2 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 inline-block ${
                isClockedIn
                  ? isFocused
                    ? 'bg-braun-orange animate-pulse'
                    : 'bg-ochre-amber animate-pulse'
                  : 'bg-[#40403D]'
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#F4F1EA]">
              SEC.02 // DESK TELEMETRY &amp; TIME AT WORKSTATION
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isClockedIn ? (
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#252523] border border-[#3E3E3B] text-braun-orange font-bold uppercase tracking-wider">
                [SENSOR ACTIVE: 200MS LOOP]
              </span>
            ) : (
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#252523] border border-[#3E3E3B] text-[#8C887F] uppercase tracking-wider">
                [STANDBY // DESK DISENGAGED]
              </span>
            )}
          </div>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-6 dark-dot-grid-pattern flex flex-col justify-between gap-6">
          {/* Top Row: The 3 Core Digital Telemetry Metric Displays */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#2C2C2A] border border-[#2C2C2A] bg-[#1A1A18]/90">
            {/* Metric 1: Time at Desk (Focused + Distracted) */}
            <div className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C887F]">
                  METRIC 01 // TOTAL
                </span>
                <Laptop size={13} className="text-[#8C887F]" />
              </div>
              <span className="text-[11px] font-mono uppercase text-[#B5B0A4] font-medium">
                Time at Desk Today
              </span>
              <div className="mt-2 font-mono text-2xl lg:text-3xl font-bold tracking-tight text-[#F4F1EA] tabular-nums">
                {formatSecondsToDigital(totalDayAtDeskSec)}
              </div>
              <span className="text-[9px] font-mono text-[#6E6A63] mt-1">
                COMBINED WORKSTATION DURATION
              </span>
            </div>

            {/* Metric 2: Focused Hours */}
            <div className="p-4 flex flex-col justify-between bg-braun-orange/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-braun-orange font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-braun-orange inline-block"></span>
                  METRIC 02 // FOCUS
                </span>
                <Zap size={13} className="text-braun-orange" />
              </div>
              <span className="text-[11px] font-mono uppercase text-braun-orange/90 font-medium">
                Focused Hours
              </span>
              <div className="mt-2 font-mono text-2xl lg:text-3xl font-bold tracking-tight text-braun-orange tabular-nums">
                {formatSecondsToDigital(totalDayFocusedSec)}
              </div>
              <span className="text-[9px] font-mono text-[#8C887F] mt-1">
                DEEP WORK &amp; FLOW STATE ACCRUED
              </span>
            </div>

            {/* Metric 3: Distracted Hours */}
            <div className="p-4 flex flex-col justify-between bg-ochre-amber/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ochre-amber font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-ochre-amber inline-block"></span>
                  METRIC 03 // DRIFT
                </span>
                <Coffee size={13} className="text-ochre-amber" />
              </div>
              <span className="text-[11px] font-mono uppercase text-ochre-amber/90 font-medium">
                Distracted Hours
              </span>
              <div className="mt-2 font-mono text-2xl lg:text-3xl font-bold tracking-tight text-ochre-amber tabular-nums">
                {formatSecondsToDigital(totalDayDistractedSec)}
              </div>
              <span className="text-[9px] font-mono text-[#8C887F] mt-1">
                ATTENTION DRIFT &amp; DISPERSION
              </span>
            </div>
          </div>

          {/* Middle Row: Giant Mechanical Rocker Switch & State Machine Control */}
          <div className="border border-[#2C2C2A] bg-[#161615] p-5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
              {/* Left Side: Master Clock In / Out Toggle Button */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C887F]">
                  MASTER SESSION STATE
                </span>
                {!isClockedIn ? (
                  <button
                    onClick={clockIn}
                    className="btn-mechanical-orange text-sm font-bold px-6 py-3.5 flex items-center gap-2.5 shadow-lg tracking-wider"
                  >
                    <Power size={16} />
                    <span>[CLOCK IN TO DESK]</span>
                  </button>
                ) : (
                  <button
                    onClick={requestClockOut}
                    className="btn-dark-mechanical text-xs font-bold px-5 py-3 flex items-center gap-2 border-ochre-amber/50 hover:border-ochre-amber hover:text-ochre-amber"
                  >
                    <Power size={14} className="text-ochre-amber" />
                    <span>[LEAVE DESK // CLOCK OUT]</span>
                  </button>
                )}
                {isClockedIn && (
                  <span className="font-mono text-[10px] text-[#8C887F]">
                    Current Session: {formatSecondsToDigital(currentSessionTotalSec)}
                  </span>
                )}
              </div>

              {/* Center / Right: Giant Physical Rocker Switch */}
              <div className="flex-1 max-w-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C887F]">
                    PHYSICAL ROCKER SWITCH
                  </span>
                  <span className="font-mono text-[10px] text-[#B5B0A4] bg-[#222220] border border-[#333330] px-2 py-0.5">
                    KEYBOARD SHORTCUT: <strong className="text-white">SPACEBAR</strong>
                  </span>
                </div>

                {/* The Physical Rocker Housing */}
                <div
                  onClick={isClockedIn ? toggleState : clockIn}
                  className={`cursor-pointer select-none border-2 transition-all p-2 bg-[#0E0E0D] relative ${
                    isClockedIn
                      ? isFocused
                        ? 'border-braun-orange/80'
                        : 'border-ochre-amber/80'
                      : 'border-[#2E2E2C] opacity-60'
                  }`}
                  title={isClockedIn ? 'Click or hit Spacebar to toggle state' : 'Click to clock in'}
                >
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {/* Left Half: LOCKED IN // FOCUSED */}
                    <div
                      className={`p-3 border transition-all flex flex-col items-center justify-center gap-1 ${
                        isClockedIn && isFocused
                          ? 'bg-braun-orange text-white border-braun-orange shadow-inner font-bold'
                          : 'bg-[#1C1C1A] text-[#8C887F] border-[#2C2C2A] hover:bg-[#252522]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-none inline-block border ${
                            isClockedIn && isFocused
                              ? 'bg-white border-white'
                              : 'bg-transparent border-[#555]'
                          }`}
                        />
                        <span className="font-mono text-xs tracking-wider">
                          [LOCKED IN // FOCUSED]
                        </span>
                      </div>
                      <span className="font-mono text-[10px] opacity-80 tabular-nums">
                        {isClockedIn ? formatSecondsToDigital(currentSessionFocusedSec) : '--:--:--'}
                      </span>
                    </div>

                    {/* Right Half: DRIFTING // DISTRACTED */}
                    <div
                      className={`p-3 border transition-all flex flex-col items-center justify-center gap-1 ${
                        isClockedIn && !isFocused
                          ? 'bg-ochre-amber text-white border-ochre-amber shadow-inner font-bold'
                          : 'bg-[#1C1C1A] text-[#8C887F] border-[#2C2C2A] hover:bg-[#252522]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-none inline-block border ${
                            isClockedIn && !isFocused
                              ? 'bg-white border-white'
                              : 'bg-transparent border-[#555]'
                          }`}
                        />
                        <span className="font-mono text-xs tracking-wider">
                          [DRIFTING // DISTRACTED]
                        </span>
                      </div>
                      <span className="font-mono text-[10px] opacity-80 tabular-nums">
                        {isClockedIn ? formatSecondsToDigital(currentSessionDistractedSec) : '--:--:--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Live Desk Efficiency Readout & 20-Segment LED Ratio Bar */}
          <div className="border border-[#2C2C2A] bg-[#161615] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#8C887F] uppercase tracking-wider">
                  LIVE DESK EFFICIENCY:
                </span>
                <span
                  className={`font-mono text-lg font-bold tabular-nums ${
                    deskEfficiencyPercent >= 80
                      ? 'text-[#5CD450]'
                      : deskEfficiencyPercent >= 50
                      ? 'text-braun-orange'
                      : 'text-ochre-amber'
                  }`}
                >
                  {deskEfficiencyPercent}%
                </span>
                <span className="font-mono text-[10px] text-[#6E6A63]">
                  (FOCUSED / TIME AT DESK)
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span className="flex items-center gap-1.5 text-braun-orange">
                  <span className="w-2 h-2 bg-braun-orange"></span>
                  FOCUS ({focusedSegments}/20)
                </span>
                <span className="flex items-center gap-1.5 text-ochre-amber">
                  <span className="w-2 h-2 bg-ochre-amber"></span>
                  DISTRACTION ({distractedSegments}/20)
                </span>
              </div>
            </div>

            {/* 20-Segment Horizontal LED Bar */}
            <div className="grid grid-cols-20 gap-1 p-1.5 bg-[#0C0C0B] border border-[#2A2A28]">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
                const isLitFocus = idx < focusedSegments;
                const isLitDistract = !isLitFocus && idx < (focusedSegments + distractedSegments);

                let bgClass = 'bg-[#1F1F1D] border-[#292926]';
                if (isLitFocus) {
                  bgClass = 'bg-braun-orange border-[#FF5B3E]';
                } else if (isLitDistract) {
                  bgClass = 'bg-ochre-amber border-[#EAA232]';
                }

                return (
                  <div
                    key={idx}
                    className={`h-5 border transition-colors duration-150 ${bgClass}`}
                    title={`Segment ${idx + 1}/${TOTAL_SEGMENTS}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* End-of-Session Calibration Modal */}
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
