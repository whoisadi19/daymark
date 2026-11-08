import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, formatSecondsToDigital, formatTaskDuration } from '../db/db';
import { UseDeskTimerReturn } from '../hooks/useDeskTimer';
import { useDailyRollover } from '../hooks/useDailyRollover';
import { CalibrationModal } from './CalibrationModal';
import {
  Maximize2,
  Check,
  Play,
  ChevronDown,
  Minus,
  Square,
  X,
} from 'lucide-react';
import {
  minimizeNativeWindow,
  toggleMaximizeNativeWindow,
  closeNativeWindow,
  handleWindowDrag,
} from '../utils/tauriWindow';

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
    <div className="w-screen h-screen rounded-[28px] overflow-hidden select-none font-sans relative bg-[#121216]/75 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col justify-between p-3.5 box-border">
      {/* Vibrant Ambient Light Orbs behind frosted cards */}
      <div className="w-[240px] h-[240px] rounded-full bg-[#D71921]/35 blur-[70px] absolute -top-12 -right-12 pointer-events-none" />
      <div className="w-[240px] h-[240px] rounded-full bg-white/15 blur-[80px] absolute -bottom-12 -left-12 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:10px_100%] pointer-events-none opacity-80" />

      {/* Top Header Row (Draggable on Linux) */}
      <div
        data-tauri-drag-region
        onMouseDown={handleWindowDrag}
        className="flex items-center justify-between pb-2 border-b border-white/[0.12] cursor-move relative z-10 shrink-0"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_8px_#D71921]" />
          <span className="font-mono font-bold text-xs tracking-wider text-white">DAYMARK</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
            WIDGET
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/60 font-mono mr-1 pointer-events-none">
            {dateFormatted}
          </span>

          {/* 4 Frosted Window Buttons: Widget/Full, Minimize, Maximize, Close */}
          {/* 1. Toggle Full View (900x640) */}
          <button
            onClick={onExitWidgetMode}
            className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Expand to Full View (900x640)"
          >
            <Maximize2 size={11} />
          </button>

          {/* 2. Minimize */}
          <button
            onClick={minimizeNativeWindow}
            className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Minimize Widget"
          >
            <Minus size={11} />
          </button>

          {/* 3. Maximize / Restore */}
          <button
            onClick={toggleMaximizeNativeWindow}
            className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Maximize / Restore"
          >
            <Square size={10} />
          </button>

          {/* 4. Close */}
          <button
            onClick={closeNativeWindow}
            className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-[#D71921] hover:border-[#D71921] border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Close DAYMARK"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Live Timer & State Pill Card */}
      <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center relative overflow-hidden z-10 shrink-0">
        <div className="flex items-center gap-2">
          {timer.isClockedIn ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                isFocused
                  ? 'bg-[#D71921]/20 text-white border-[#D71921]/40 shadow-[0_0_10px_rgba(215,25,33,0.3)]'
                  : 'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider text-white/50 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              STANDBY
            </span>
          )}
        </div>

        {/* Big Razor-Sharp Tabular Monospace Clocks */}
        <div className="font-mono text-4xl font-light tracking-tight text-white tabular-nums">
          {formatSecondsToDigital(
            timer.isClockedIn ? timer.currentSessionTotalSec : timer.totalDayFocusedSec
          )}
        </div>

        {/* ASCII State Banner */}
        <div className="text-[10px] font-mono tracking-wider opacity-75">
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
      <div className="relative z-20 shrink-0">
        <button
          onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
          className="w-full flex items-center justify-between p-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-xl text-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-[9px] font-mono text-white/50 uppercase">Task:</span>
            <span className="text-white/90 truncate font-medium text-xs">
              {activeTask ? activeTask.title : 'General Focus'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-white/50 shrink-0">
            {activeTask?.focusedSeconds ? (
              <span className="text-[10px] font-mono text-[#D71921]">
                {formatTaskDuration(activeTask.focusedSeconds)}
              </span>
            ) : null}
            <ChevronDown size={12} />
          </div>
        </button>

        {/* Task Dropdown Menu */}
        {isTaskDropdownOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-[#1C1C22]/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl p-1 z-50 max-h-40 overflow-y-auto">
            <button
              onClick={() => {
                timer.setActiveTaskId(null);
                setIsTaskDropdownOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                !timer.activeTaskId
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>General Focus (Untracked)</span>
              {!timer.activeTaskId && <Check size={12} className="text-[#D71921]" />}
            </button>

            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  timer.setActiveTaskId(task.id);
                  setIsTaskDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between truncate cursor-pointer ${
                  timer.activeTaskId === task.id
                    ? 'bg-white/15 text-white font-medium'
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

      {/* Primary Action Button (Space Rocker or Clock In) */}
      <div className="shrink-0 z-10">
        {timer.isClockedIn ? (
          <div className="flex gap-2">
            <button
              onClick={timer.toggleState}
              className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-md cursor-pointer ${
                isFocused
                  ? 'bg-[#D71921] hover:bg-[#b5141b] text-white shadow-[#D71921]/30'
                  : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              }`}
            >
              <span>{isFocused ? 'FLIP TO DRIFT' : 'LOCK IN FOCUS'}</span>
              <kbd className="px-1 py-0.2 text-[8px] bg-black/30 rounded font-mono">
                SPACE
              </kbd>
            </button>

            <button
              onClick={timer.requestClockOut}
              className="px-2.5 py-2 bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 rounded-xl text-[10px] font-mono text-white/70 hover:text-white transition-colors cursor-pointer"
              title="End Session"
            >
              END
            </button>
          </div>
        ) : (
          <button
            onClick={timer.clockIn}
            className="w-full py-2.5 px-3 rounded-xl font-mono text-xs font-semibold tracking-wider bg-[#ECECEF] hover:bg-white text-[#0A0A0C] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer"
          >
            <Play size={12} fill="currentColor" />
            <span>START FOCUS SESSION</span>
          </button>
        )}
      </div>

      {/* Top 3 Today Tasks */}
      <div className="pt-2 border-t border-white/[0.12] flex flex-col gap-1.5 z-10 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-white/50 font-mono">
          <span>TODAY'S PRIORITIES</span>
          <span>
            {completedCount}/{tasks.length}
          </span>
        </div>

        <div className="space-y-1">
          {top3Tasks.length === 0 ? (
            <div className="text-[11px] text-white/30 italic py-1 text-center font-mono">
              No priorities set for today
            </div>
          ) : (
            top3Tasks.map((t) => {
              const isActive = timer.activeTaskId === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-1.5 rounded-xl border transition-all text-xs ${
                    isActive
                      ? 'bg-white/[0.1] border-[#D71921]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(t.id)}
                      className="nothing-checkbox shrink-0"
                    />
                    <span
                      className={`truncate text-[11px] ${
                        t.completed ? 'line-through text-white/40' : 'text-white/90'
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {t.focusedSeconds && t.focusedSeconds > 0 ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
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
        <form onSubmit={handleQuickAdd} className="mt-0.5">
          <input
            type="text"
            value={newPriorityTitle}
            onChange={(e) => setNewPriorityTitle(e.target.value)}
            placeholder="+ Add priority..."
            className="w-full bg-white/[0.04] focus:bg-white/[0.08] border border-white/10 focus:border-white/30 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 outline-none transition-all"
          />
        </form>
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
