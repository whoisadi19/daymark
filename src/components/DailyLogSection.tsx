import React, { useState } from 'react';
import { db, TaskItem, formatTaskDuration, renderAsciiProgressBar } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDailyRollover } from '../hooks/useDailyRollover';
import { Target, X, Plus, Clock } from 'lucide-react';

interface DailyLogSectionProps {
  selectedDateKey: string;
}

export const DailyLogSection: React.FC<DailyLogSectionProps> = ({ selectedDateKey }) => {
  const {
    addTodayTask,
    addTomorrowTask,
    toggleTask,
    deleteTask,
    toggleGoalLink,
  } = useDailyRollover(selectedDateKey);

  const todayTasks = useLiveQuery(
    () =>
      db.tasks
        .where('dateKey')
        .equals(selectedDateKey)
        .and((t) => t.listType === 'today')
        .toArray(),
    [selectedDateKey]
  );

  const tomorrowTasks = useLiveQuery(
    () =>
      db.tasks
        .where('dateKey')
        .equals(selectedDateKey)
        .and((t) => t.listType === 'tomorrow')
        .toArray(),
    [selectedDateKey]
  );

  const [newTodayTitle, setNewTodayTitle] = useState('');
  const [newTodayGoal, setNewTodayGoal] = useState(false);

  const [newTomorrowTitle, setNewTomorrowTitle] = useState('');
  const [newTomorrowGoal, setNewTomorrowGoal] = useState(false);

  const handleAddToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodayTitle.trim()) return;
    await addTodayTask(newTodayTitle, newTodayGoal);
    setNewTodayTitle('');
    setNewTodayGoal(false);
  };

  const handleAddTomorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTomorrowTitle.trim()) return;
    const success = await addTomorrowTask(newTomorrowTitle, newTomorrowGoal);
    if (success) {
      setNewTomorrowTitle('');
      setNewTomorrowGoal(false);
    }
  };

  const todayCompletedCount = todayTasks?.filter((t) => t.completed).length || 0;
  const todayTotalCount = todayTasks?.length || 0;
  const todayPercent = todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 0;
  const tomorrowCount = tomorrowTasks?.length || 0;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 my-auto animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* CARD 1: TODAY */}
      {/* ============================================================== */}
      <section className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[460px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#D71921]" />
              <h2 className="text-base font-semibold tracking-tight text-white">
                Today
              </h2>
            </div>

            {/* ASCII progress & counter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-white/50 hidden sm:inline">
                {renderAsciiProgressBar(todayPercent, 8)}
              </span>
              <div className="bg-white/[0.08] border border-white/[0.08] px-2.5 py-0.5 rounded-full text-xs font-mono text-white/90 font-medium">
                {todayCompletedCount}/{todayTotalCount}
              </div>
            </div>
          </div>

          {/* Tasks List with Clean Scrollable View */}
          <div className="my-4 space-y-2 overflow-y-auto max-h-[340px] pr-1">
            {todayTasks && todayTasks.map((task: TaskItem) => {
              const durationStr = formatTaskDuration(task.focusedSeconds);

              return (
                <div
                  key={task.id}
                  className="group bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="nothing-checkbox shrink-0"
                      title={task.completed ? 'Mark uncompleted' : 'Mark completed'}
                    />

                    <p
                      className={`text-xs leading-relaxed break-words transition-all flex-1 min-w-0 ${
                        task.completed ? 'line-through text-white/40' : 'text-white/90 font-medium'
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Time Spent on Task Badge (e.g. 45m) */}
                    {durationStr && (
                      <span
                        className="font-mono text-[10px] text-white/80 bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10"
                        title={`Time spent: ${durationStr}`}
                      >
                        <Clock size={10} className="text-[#D71921]" />
                        {durationStr}
                      </span>
                    )}

                    {/* Stale Badge (>= 3 days) */}
                    {!task.completed && task.rolloverCount >= 3 && (
                      <span
                        className="font-mono text-[10px] text-[#D71921] bg-[#D71921]/15 border border-[#D71921]/30 px-1.5 py-0.5 rounded-full font-bold"
                        title={`Rolled over ${task.rolloverCount} days`}
                      >
                        {task.rolloverCount}D
                      </span>
                    )}

                    {/* Goal Dot */}
                    {task.linkedToGoal && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_8px_#D71921]"
                        title="Linked to Goal"
                      />
                    )}

                    {/* Completed Timestamp */}
                    {task.completed && task.completedAt && (
                      <span className="font-mono text-[10px] text-white/40">
                        {task.completedAt}
                      </span>
                    )}

                    {/* Delete Task */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1 transition-opacity cursor-pointer"
                      title="Delete task"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!todayTasks || todayTasks.length === 0) && (
              <div className="py-8 text-center text-xs font-mono text-white/30 tracking-wider">
                ┌─ NO TASKS LOGGED TODAY ─┐
              </div>
            )}
          </div>
        </div>

        {/* Bottom Frosted Input Pill */}
        <form onSubmit={handleAddToday} className="pt-2">
          <div className="bg-white/[0.06] hover:bg-white/[0.08] focus-within:bg-white/[0.1] border border-white/[0.1] rounded-2xl px-4 py-3 flex items-center gap-2.5 transition">
            <Plus size={14} className="text-white/40 shrink-0" />
            <input
              type="text"
              placeholder="+ Add what you did..."
              value={newTodayTitle}
              onChange={(e) => setNewTodayTitle(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
            />
            {newTodayTitle.trim() && (
              <button
                type="button"
                onClick={() => setNewTodayGoal(!newTodayGoal)}
                className={`p-1 rounded-full transition-colors cursor-pointer ${
                  newTodayGoal ? 'text-[#D71921]' : 'text-white/40 hover:text-white'
                }`}
                title="Toggle Goal Link"
              >
                <Target size={13} />
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ============================================================== */}
      {/* CARD 2: TOMORROW */}
      {/* ============================================================== */}
      <section className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[460px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-white/40" />
              <h2 className="text-base font-semibold tracking-tight text-white">
                Tomorrow
              </h2>
            </div>

            {/* Task Count Badge (Turns subtle amber if > 5) */}
            <div className="flex items-center gap-2">
              <div
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium transition-colors border ${
                  tomorrowCount > 5
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-white/[0.08] text-white/90 border-white/[0.08]'
                }`}
              >
                {tomorrowCount} {tomorrowCount === 1 ? 'task' : 'tasks'}
              </div>
            </div>
          </div>

          {/* Tomorrow List with Clean Scrollable View */}
          <div className="my-4 space-y-2 overflow-y-auto max-h-[340px] pr-1">
            {tomorrowTasks && tomorrowTasks.map((task: TaskItem, idx: number) => {
              const slotNum = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={task.id}
                  className="group bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <span className="font-mono text-xs text-white/50">
                      {slotNum}
                    </span>
                    <p className="text-xs text-white/90 font-medium truncate">
                      {task.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.linkedToGoal && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_8px_#D71921]"
                        title="Linked to goal"
                      />
                    )}
                    <button
                      onClick={() => toggleGoalLink(task.id)}
                      className={`p-1 transition-colors cursor-pointer ${
                        task.linkedToGoal ? 'text-[#D71921]' : 'text-white/40 hover:text-white'
                      }`}
                      title="Toggle goal"
                    >
                      <Target size={12} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1 transition-opacity cursor-pointer"
                      title="Delete task"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!tomorrowTasks || tomorrowTasks.length === 0) && (
              <div className="py-8 text-center text-xs font-mono text-white/30 tracking-wider">
                ┌─ NO TASKS PLANNED FOR TOMORROW ─┐
              </div>
            )}
          </div>
        </div>

        {/* Bottom Frosted Input Pill (Always Active, Never Locked) */}
        <form onSubmit={handleAddTomorrow} className="pt-2">
          <div className="bg-white/[0.06] hover:bg-white/[0.08] focus-within:bg-white/[0.1] border border-white/[0.1] rounded-2xl px-4 py-3 flex items-center gap-2.5 transition">
            <Plus size={14} className="text-white/40 shrink-0" />
            <input
              type="text"
              placeholder="+ Plan for tomorrow..."
              value={newTomorrowTitle}
              onChange={(e) => setNewTomorrowTitle(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
            />
            {newTomorrowTitle.trim() && (
              <button
                type="button"
                onClick={() => setNewTomorrowGoal(!newTomorrowGoal)}
                className={`p-1 rounded-full transition-colors cursor-pointer ${
                  newTomorrowGoal ? 'text-[#D71921]' : 'text-white/40 hover:text-white'
                }`}
                title="Toggle Goal Link"
              >
                <Target size={13} />
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
};
