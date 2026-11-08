import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, formatSecondsToDigital, formatTaskDuration } from '../db/db';
import { UseDeskTimerReturn } from '../hooks/useDeskTimer';
import { useDailyRollover } from '../hooks/useDailyRollover';
import { CalibrationModal } from './CalibrationModal';
import { Maximize2, Check, Play, ChevronDown } from 'lucide-react';

interface WidgetViewProps {
  selectedDateKey: string;
  timer: UseDeskTimerReturn;
  onExitWidgetMode: () => void;
}

export const WidgetView: React.FC<WidgetViewProps> = ({
  selectedDateKey,
  timer,
  onExitWidgetMode,
}) => {
  const { toggleTask, addTodayTask } = useDailyRollover(selectedDateKey);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [newPriorityTitle, setNewPriorityTitle] = useState('');

  // Fetch today's tasks
  const todayTasks = useLiveQuery(
    () =>
      db.tasks
        .where('dateKey')
        .equals(selectedDateKey)
        .and((t) => t.listType === 'today')
        .toArray(),
    [selectedDateKey]
  );

  const tasks = todayTasks || [];
  const activeTask = tasks.find((t) => t.id === timer.activeTaskId) || null;
  const top3Tasks = tasks.slice(0, 3);
  const completedCount = tasks.filter((t) => t.completed).length;

  // Date formatting
  const [y, m, d] = selectedDateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const isFocused = timer.currentState === 'focused';

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityTitle.trim()) return;
    await addTodayTask(newPriorityTitle.trim(), false);
    setNewPriorityTitle('');
  };

  return (
    <div className="w-full max-w-[380px] mx-auto select-none flex flex-col gap-3 font-sans">
      {/* Smoked Dark Glass Widget Card */}
      <div className="bg-[#161618]/90 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-[#F2F2F4] flex flex-col gap-4">
        {/* Widget Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_8px_#D71921]" />
            <span className="font-mono font-bold text-xs tracking-wider text-white">DAYMARK</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
              WIDGET
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 font-mono">{dateFormatted}</span>
            <button
              onClick={onExitWidgetMode}
              className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
              title="Expand to Full View"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        </div>

        {/* Live Timer & State Pill */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-col items-center gap-2 text-center relative overflow-hidden">
          {/* Subtle Ambient Glow when Clocked In */}
          {timer.isClockedIn && (
            <div
              className={`absolute -top-10 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40 ${
                isFocused ? 'bg-[#D71921]' : 'bg-amber-500'
              }`}
            />
          )}

          {/* Pill Badge */}
          <div className="flex items-center gap-2">
            {timer.isClockedIn ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                  isFocused
                    ? 'bg-[#D71921]/20 text-white border-[#D71921]/40'
                    : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    isFocused ? 'bg-[#D71921]' : 'bg-amber-400'
                  }`}
                />
                {isFocused ? 'LOCKED IN' : 'DRIFTING'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider text-white/40 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                STANDBY
              </span>
            )}
          </div>

          {/* Large Monospace Timer Digits */}
          <div className="font-mono text-4xl sm:text-5xl font-light tracking-tight text-white tabular-nums my-1">
            {formatSecondsToDigital(
              timer.isClockedIn ? timer.currentSessionTotalSec : timer.totalDayFocusedSec
            )}
          </div>

          {/* ASCII State Indicator */}
          <div className="text-[10px] font-mono tracking-wider opacity-60">
            {timer.isClockedIn ? (
              isFocused ? (
                <span className="text-[#D71921] animate-pulse">
                  [:: LOCKED IN // ▓▓▓▓▓▓▒▒░░ ::]
                </span>
              ) : (
                <span className="text-amber-400">
                  [:: DRIFTING // ░░▒▒░░▒▒░░ ::]
                </span>
              )
            ) : (
              <span className="text-white/40">[:: DESK TELEMETRY READY ::]</span>
            )}
          </div>
        </div>

        {/* Active Task Selector */}
        <div className="relative">
          <button
            onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-mono text-white/40 uppercase">Task:</span>
              <span className="text-white/90 truncate font-medium">
                {activeTask ? activeTask.title : 'General Work / Untracked'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-white/50 shrink-0">
              {activeTask?.focusedSeconds ? (
                <span className="text-[10px] font-mono text-[#D71921]">
                  {formatTaskDuration(activeTask.focusedSeconds)}
                </span>
              ) : null}
              <ChevronDown size={13} />
            </div>
          </button>

          {/* Task Dropdown Menu */}
          {isTaskDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1C1C1F] border border-white/15 rounded-xl shadow-2xl p-1 z-30 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  timer.setActiveTaskId(null);
                  setIsTaskDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  !timer.activeTaskId
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>General Focus (No specific task)</span>
                {!timer.activeTaskId && <Check size={12} className="text-[#D71921]" />}
              </button>

              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    timer.setActiveTaskId(task.id);
                    setIsTaskDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between truncate ${
                    timer.activeTaskId === task.id
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`truncate ${task.completed ? 'line-through opacity-50' : ''}`}>
                    {task.title}
                  </span>
                  {timer.activeTaskId === task.id && (
                    <Check size={12} className="text-[#D71921] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Primary Mechanical Action Rocker */}
        {timer.isClockedIn ? (
          <div className="space-y-2">
            <button
              onClick={timer.toggleState}
              className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${
                isFocused
                  ? 'bg-[#D71921] hover:bg-[#b5141b] text-white shadow-[#D71921]/30'
                  : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              }`}
            >
              <span>{isFocused ? 'FLIP TO DRIFT' : 'LOCK IN FOCUS'}</span>
              <kbd className="px-1.5 py-0.5 text-[9px] bg-black/25 rounded font-mono">
                SPACE
              </kbd>
            </button>

            <button
              onClick={timer.requestClockOut}
              className="w-full py-1.5 text-center text-[11px] font-mono text-white/50 hover:text-white/80 transition-colors"
            >
              [ END SESSION & CALIBRATE ]
            </button>
          </div>
        ) : (
          <button
            onClick={timer.clockIn}
            className="w-full py-3 px-4 rounded-xl font-mono text-xs font-semibold tracking-wider bg-[#ECECEF] hover:bg-white text-[#0A0A0C] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md"
          >
            <Play size={13} fill="currentColor" />
            <span>START FOCUS SESSION</span>
          </button>
        )}

        {/* Top 3 Today Tasks */}
        <div className="pt-2 border-t border-white/[0.08] flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
            <span>TODAY'S PRIORITIES</span>
            <span>
              {completedCount}/{tasks.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {top3Tasks.length === 0 ? (
              <div className="text-xs text-white/30 italic py-2 text-center font-mono">
                No priorities set for today
              </div>
            ) : (
              top3Tasks.map((t) => {
                const isActive = timer.activeTaskId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all text-xs ${
                      isActive
                        ? 'bg-white/[0.08] border-[#D71921]/50'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggleTask(t.id)}
                        className="nothing-checkbox shrink-0"
                      />
                      <span
                        className={`truncate ${
                          t.completed ? 'line-through text-white/40' : 'text-white/90'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {t.focusedSeconds && t.focusedSeconds > 0 ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                          {formatTaskDuration(t.focusedSeconds)}
                        </span>
                      ) : null}
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#D71921] animate-pulse"
                          title="Currently Active"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Priority Input */}
          <form onSubmit={handleQuickAdd} className="mt-1 flex items-center gap-1.5">
            <input
              type="text"
              value={newPriorityTitle}
              onChange={(e) => setNewPriorityTitle(e.target.value)}
              placeholder="+ Add priority..."
              className="w-full bg-white/[0.03] focus:bg-white/[0.07] border border-white/10 focus:border-white/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none transition-all"
            />
          </form>
        </div>
      </div>

      {/* Session Calibration Modal */}
      {timer.showCalibrationModal && timer.calibrationData && (
        <CalibrationModal
          data={timer.calibrationData}
          onCommit={timer.commitSession}
          onCancel={timer.cancelClockOut}
        />
      )}
    </div>
  );
};
