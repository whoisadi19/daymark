import React, { useState } from 'react';
import { db, TaskItem } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDailyRollover } from '../hooks/useDailyRollover';
import { Target, X, Plus } from 'lucide-react';

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
  const tomorrowCount = tomorrowTasks?.length || 0;
  const isTomorrowFull = tomorrowCount >= 5;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 my-auto animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* LEFT SMOKED GLASS CARD: WHAT I DID TODAY */}
      {/* ============================================================== */}
      <section className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[460px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              <span>What I did today</span>
            </h2>
            <div className="bg-white/[0.08] border border-white/[0.08] px-2.5 py-0.5 rounded-full text-xs font-ndot text-white/90">
              {todayCompletedCount}/{todayTotalCount}
            </div>
          </div>

          {/* Tasks List */}
          <div className="my-4 space-y-2">
            {todayTasks && todayTasks.map((task: TaskItem) => (
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
                  {/* Stale Badge (>= 3 days) */}
                  {!task.completed && task.rolloverCount >= 3 && (
                    <span
                      className="font-ndot text-[10px] text-[#D71921] bg-[#D71921]/15 border border-[#D71921]/30 px-1.5 py-0.5 rounded-full"
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
                    <span className="font-ndot text-[10px] text-white/40">
                      {task.completedAt}
                    </span>
                  )}

                  {/* Delete Task */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1 transition-opacity"
                    title="Delete task"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}

            {(!todayTasks || todayTasks.length === 0) && (
              <div className="py-8 text-center text-xs font-ndot text-white/30 tracking-wider">
                NO TASKS RECORDED FOR TODAY
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
              placeholder="Add what you did..."
              value={newTodayTitle}
              onChange={(e) => setNewTodayTitle(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
            />
            {newTodayTitle.trim() && (
              <button
                type="button"
                onClick={() => setNewTodayGoal(!newTodayGoal)}
                className={`p-1 rounded-full transition-colors ${
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
      {/* RIGHT SMOKED GLASS CARD: WHAT I WILL DO TOMORROW */}
      {/* ============================================================== */}
      <section className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[460px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              <span>What I will do tomorrow</span>
            </h2>

            {/* 5 Circular LED dots */}
            <div className="flex items-center gap-2">
              <span className="font-ndot text-xs text-white/60">
                {tomorrowCount}/5
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((slotIdx) => (
                  <span
                    key={slotIdx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      slotIdx < tomorrowCount
                        ? 'bg-[#D71921] shadow-[0_0_8px_#D71921]'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tomorrow List */}
          <div className="my-4 space-y-2">
            {[0, 1, 2, 3, 4].map((slotIndex) => {
              const task = tomorrowTasks?.[slotIndex];
              const slotNum = String(slotIndex + 1).padStart(2, '0');

              if (task) {
                return (
                  <div
                    key={task.id}
                    className="group bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <span className="font-ndot text-xs text-white/50">
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
                        className={`p-1 transition-colors ${
                          task.linkedToGoal ? 'text-[#D71921]' : 'text-white/40 hover:text-white'
                        }`}
                        title="Toggle goal"
                      >
                        <Target size={12} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1 transition-opacity"
                        title="Delete task"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`empty-slot-${slotIndex}`}
                  className="bg-white/[0.02] border border-dashed border-white/[0.06] rounded-2xl px-4 py-3 flex items-center text-xs font-ndot text-white/25 select-none"
                >
                  {slotNum} · AVAILABLE PRIORITY SLOT
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Frosted Input Pill */}
        <form onSubmit={handleAddTomorrow} className="pt-2">
          {!isTomorrowFull ? (
            <div className="bg-white/[0.06] hover:bg-white/[0.08] focus-within:bg-white/[0.1] border border-white/[0.1] rounded-2xl px-4 py-3 flex items-center gap-2.5 transition">
              <Plus size={14} className="text-white/40 shrink-0" />
              <input
                type="text"
                placeholder="Plan for tomorrow..."
                value={newTomorrowTitle}
                onChange={(e) => setNewTomorrowTitle(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
              />
              {newTomorrowTitle.trim() && (
                <button
                  type="button"
                  onClick={() => setNewTomorrowGoal(!newTomorrowGoal)}
                  className={`p-1 rounded-full transition-colors ${
                    newTomorrowGoal ? 'text-[#D71921]' : 'text-white/40 hover:text-white'
                  }`}
                  title="Toggle Goal Link"
                >
                  <Target size={13} />
                </button>
              )}
            </div>
          ) : (
            <div className="h-11 flex items-center justify-center text-xs text-white/50 font-ndot bg-white/[0.03] rounded-2xl border border-white/[0.08]">
              5/5 SLOTS OCCUPIED
            </div>
          )}
        </form>
      </section>
    </div>
  );
};
