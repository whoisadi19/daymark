import React, { useState } from 'react';
import { useDeskTimer, UseDeskTimerReturn } from '../hooks/useDeskTimer';
import { db, TaskItem, formatSecondsToDigital, formatTaskDuration, renderAsciiProgressBar } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalibrationModal } from './CalibrationModal';
import { Play, Square, Zap, Coffee, RotateCcw, ChevronDown, Check, Plus } from 'lucide-react';

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
    activeTaskId,
    setActiveTaskId,
    totalDayFocusedSec,
    totalDayDistractedSec,
    totalDayAtDeskSec,
    deskEfficiencyPercent,
    clockIn,
    toggleState,
    requestClockOut,
    commitSession,
    cancelClockOut,
    resetTimer,
    showCalibrationModal,
    calibrationData,
  } = activeTimer;

  // Active task selection state
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [isCreatingCustomTask, setIsCreatingCustomTask] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Live queries for tasks today and tomorrow
  const todayTasks = useLiveQuery(
    () => db.tasks.where('dateKey').equals(selectedDateKey).toArray(),
    [selectedDateKey]
  );

  const activeTask = todayTasks?.find((t) => t.id === activeTaskId);

  // Handle adding custom task
  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = customTaskTitle.trim();
    if (!title) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dateKey: selectedDateKey,
      listType: 'today',
      title,
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: false,
      focusedSeconds: 0,
      updatedAt: Date.now(),
    };

    await db.tasks.put(newTask);
    setActiveTaskId(newTask.id);
    setCustomTaskTitle('');
    setIsCreatingCustomTask(false);
    setShowTaskDropdown(false);
  };

  // Filter tasks with recorded time for today's time breakdown
  const tasksWithTime = todayTasks?.filter((t) => (t.focusedSeconds || 0) > 0) || [];

  const isFocused = currentState === 'focused';

  return (
    <>
      <section className="max-w-[580px] mx-auto w-full my-auto flex flex-col gap-4 animate-in fade-in duration-200">
        {/* ============================================================== */}
        {/* ACTIVE TASK SELECTOR PILL (WORKING ON: ...) */}
        {/* ============================================================== */}
        <div className="relative z-20">
          {!isCreatingCustomTask ? (
            <div className="bg-[#161618]/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 px-4 flex items-center justify-between text-xs text-white/80 shadow-md">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <span className="text-[10px] font-mono uppercase text-white/40 tracking-wider shrink-0">
                  WORKING ON:
                </span>
                <span className="font-medium text-white truncate">
                  {activeTask ? activeTask.title : 'General Focus (No Task Linked)'}
                </span>
              </div>

              <button
                onClick={() => setShowTaskDropdown(!showTaskDropdown)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-3 py-1 rounded-xl text-xs font-mono text-white transition-all shrink-0"
              >
                <span>Select Task</span>
                <ChevronDown size={12} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateCustomTask} className="bg-[#161618]/90 border border-[#D71921]/40 rounded-2xl p-2 px-3 flex items-center gap-2 shadow-lg">
              <input
                type="text"
                placeholder="Type unplanned custom task..."
                value={customTaskTitle}
                onChange={(e) => setCustomTaskTitle(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none px-2"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 bg-[#D71921] text-white rounded-xl text-xs font-medium"
              >
                Start Tracking
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingCustomTask(false)}
                className="text-white/40 hover:text-white px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Task Dropdown Menu */}
          {showTaskDropdown && !isCreatingCustomTask && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#161618]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-2 z-50 text-xs font-sans">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-white/50 text-[10px] font-mono uppercase">
                <span>Select Target Task</span>
                <button onClick={() => setShowTaskDropdown(false)} className="hover:text-white">✕</button>
              </div>

              <div className="max-h-48 overflow-y-auto py-1 space-y-1">
                {/* General focus option */}
                <button
                  onClick={() => {
                    setActiveTaskId(null);
                    setShowTaskDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                    !activeTaskId ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span>General Focus (No Specific Task)</span>
                  {!activeTaskId && <Check size={12} className="text-[#D71921]" />}
                </button>

                {/* Today's Tasks */}
                {todayTasks && todayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setActiveTaskId(task.id);
                      setShowTaskDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                      activeTaskId === task.id ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate pr-2">{task.title}</span>
                    {activeTaskId === task.id && <Check size={12} className="text-[#D71921] shrink-0" />}
                  </button>
                ))}
              </div>

              {/* + Custom Task Button */}
              <div className="border-t border-white/10 pt-1">
                <button
                  onClick={() => {
                    setIsCreatingCustomTask(true);
                    setShowTaskDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-[#D71921] font-medium transition-colors"
                >
                  <Plus size={13} />
                  <span>+ Custom Task on the fly...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 1. MAIN HERO WIDGET: TIME AT DESK (RAZOR-SHARP MONO + ASCII) */}
        {/* ============================================================== */}
        <div className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[32px] p-7 sm:p-8 text-white relative overflow-hidden">
          {/* Subtle Ambient Red Glow when active */}
          {isClockedIn && (
            <div
              className={`absolute -top-14 -right-14 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                isFocused ? 'bg-[#D71921]/30' : 'bg-amber-500/20'
              }`}
            />
          )}

          {/* Top Row: Label & ASCII Block Progress Bar */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold flex items-center gap-2">
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

            {/* ASCII progress readout */}
            <div className="bg-white/[0.08] border border-white/10 px-3 py-1 rounded-full text-xs font-mono font-medium text-white flex items-center gap-2">
              <span className="text-[10px] text-white/60 hidden sm:inline">
                {renderAsciiProgressBar(deskEfficiencyPercent, 8)}
              </span>
              <span>{deskEfficiencyPercent}%</span>
            </div>
          </div>

          {/* Center: Massive Razor-Sharp Monospace Digits */}
          <div className="my-6 sm:my-8 text-center relative z-10">
            <div className="font-mono text-6xl sm:text-7xl font-light tracking-tight text-white tabular-nums drop-shadow-md">
              {formatSecondsToDigital(totalDayAtDeskSec)}
            </div>

            {/* Animated ASCII state indicator when clocked in */}
            {isClockedIn ? (
              <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-white/70 animate-pulse">
                {isFocused
                  ? '[:: LOCKED IN // ▓▓▓▓▓▓▒▒░░ ::]'
                  : '[:: DRIFTING  // ░░▒▒░░▒▒░░ ::]'}
              </div>
            ) : (
              <div className="mt-3 font-mono text-[10px] uppercase text-white/30 tracking-widest">
                [:: WORKSTATION STANDBY ::]
              </div>
            )}
          </div>

          {/* Bottom Dual Visual Progress Line */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            {totalDayAtDeskSec > 0 ? (
              <>
                <div
                  className="h-full bg-[#D71921] transition-all duration-300"
                  style={{ width: `${(totalDayFocusedSec / totalDayAtDeskSec) * 100}%` }}
                />
                <div
                  className="h-full bg-white/25 transition-all duration-300"
                  style={{ width: `${(totalDayDistractedSec / totalDayAtDeskSec) * 100}%` }}
                />
              </>
            ) : (
              <div className="h-full w-full bg-white/5" />
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MIDDLE 2-COLUMN WIDGET ROW (FOCUSED & DISTRACTED) */}
        {/* ============================================================== */}
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
              <span className="text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-90">
                <Zap size={12} />
                FOCUSED
              </span>
              {isClockedIn && isFocused && (
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#FFF] animate-pulse" />
              )}
            </div>

            <div className="font-mono text-3xl sm:text-4xl font-light tracking-tight text-white tabular-nums my-1">
              {formatSecondsToDigital(totalDayFocusedSec)}
            </div>

            <span className="text-[10px] font-mono opacity-60 uppercase">
              {isClockedIn && isFocused ? 'ACTIVE MODE' : 'CLICK TO FOCUS'}
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
              <span className="text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-90">
                <Coffee size={12} />
                DISTRACTED
              </span>
              {isClockedIn && !isFocused && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24] animate-pulse" />
              )}
            </div>

            <div className="font-mono text-3xl sm:text-4xl font-light tracking-tight text-white tabular-nums my-1">
              {formatSecondsToDigital(totalDayDistractedSec)}
            </div>

            <span className="text-[10px] font-mono opacity-60 uppercase">
              {isClockedIn && !isFocused ? 'ACTIVE MODE' : 'CLICK TO DRIFT'}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. BOTTOM CONTROLS & RESET BUTTON */}
        {/* ============================================================== */}
        <div className="flex items-center gap-3 pt-1">
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
              {/* High-Contrast Pill Toggle */}
              <button
                onClick={toggleState}
                className="flex-1 h-14 rounded-full bg-[#ECECEF] hover:bg-white text-[#0A0A0C] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition active:scale-[0.98]"
              >
                <span>{isFocused ? 'Switch to Distracted' : 'Switch to Focused'}</span>
                <span className="text-[10px] font-mono bg-[#0A0A0C]/10 px-2 py-0.5 rounded-full uppercase">
                  Space
                </span>
              </button>

              {/* Stop & Calibrate Button */}
              <button
                onClick={requestClockOut}
                className="w-14 h-14 rounded-full bg-[#D71921] hover:bg-[#C0151D] flex items-center justify-center text-white shrink-0 shadow-[0_12px_30px_rgba(215,25,33,0.35)] transition active:scale-95"
                title="Stop & Calibrate"
              >
                <Square size={16} fill="currentColor" />
              </button>
            </>
          )}

          {/* Reset Timer Button with 2-Step Confirmation */}
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="h-14 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-all shrink-0"
              title="Reset today's desk timer to 00:00:00"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-[#D71921]/20 border border-[#D71921]/50 rounded-full px-3 h-14 shrink-0">
              <span className="text-[11px] font-mono text-red-200">Zero out?</span>
              <button
                onClick={() => {
                  resetTimer();
                  setShowResetConfirm(false);
                }}
                className="px-2 py-1 bg-[#D71921] text-white rounded-full text-[11px] font-bold"
              >
                Yes
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-white/50 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 4. TODAY'S TIME BREAKDOWN PER TASK */}
        {/* ============================================================== */}
        {tasksWithTime.length > 0 && (
          <div className="bg-[#161618]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 mt-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-2 font-bold">
              TODAY'S TIME BREAKDOWN
            </span>

            <div className="space-y-1.5">
              {tasksWithTime.map((t) => {
                const isCurrent = t.id === activeTaskId;
                const durStr = formatTaskDuration(t.focusedSeconds);
                const percentOfTotal = totalDayFocusedSec > 0
                  ? Math.round(((t.focusedSeconds || 0) / totalDayFocusedSec) * 100)
                  : 0;

                return (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-[#D71921]' : 'bg-white/30'}`} />
                      <span className={`truncate ${isCurrent ? 'text-white font-medium' : 'text-white/70'}`}>
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-white/40">{percentOfTotal}%</span>
                      <span className="bg-white/10 px-2 py-0.5 rounded-md text-white font-medium">
                        {durStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Frosted Calibration Modal */}
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
