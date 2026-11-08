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

  // Calculate ghost slots for Today when fewer than 4 items
  const todayGhostCount = Math.max(0, 4 - (todayTasks?.length || 0));

  return (
    <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* ============================================================== */}
      {/* CARD 3: TODAY'S EXECUTION */}
      {/* ============================================================== */}
      <section className="bg-[#FAF9F6] border border-[#DCD9D0] rounded-2xl p-6 flex flex-col justify-between min-h-[540px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD9D0]">
            <h2 className="text-xl font-semibold tracking-tight text-[#111110]">
              Today
            </h2>
            <div className="bg-[#F2F0EA] px-2.5 py-1 rounded-md text-xs font-mono font-medium text-[#111110]">
              {todayCompletedCount}/{todayTotalCount} DONE
            </div>
          </div>

          {/* Task List Body */}
          <div className="my-4 space-y-2">
            {todayTasks && todayTasks.map((task: TaskItem) => (
              <div
                key={task.id}
                className="group bg-[#F2F0EA]/70 hover:bg-[#F2F0EA] border border-transparent hover:border-[#DCD9D0] rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="bento-checkbox shrink-0"
                    title={task.completed ? 'Mark uncompleted' : 'Mark completed'}
                  />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-relaxed break-words transition-all ${
                        task.completed ? 'line-through text-[#9E9B93]' : 'text-[#111110] font-medium'
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Stale Badge (>= 3 times) */}
                  {!task.completed && task.rolloverCount >= 3 && (
                    <span
                      className="font-mono text-[10px] text-[#D97706] font-semibold px-1.5 py-0.5 rounded bg-[#FFFBEB] border border-[#D97706]/30"
                      title={`Rolled over ${task.rolloverCount} days`}
                    >
                      {task.rolloverCount}d stale
                    </span>
                  )}

                  {/* Goal Badge */}
                  {task.linkedToGoal && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#E5391A]"
                      title="Linked to Short-Term Goal"
                    />
                  )}

                  {/* Done Time */}
                  {task.completed && task.completedAt && (
                    <span className="font-mono text-[10px] text-[#9E9B93]">
                      {task.completedAt}
                    </span>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#9E9B93] hover:text-[#111110] p-1 transition-opacity"
                    title="Delete task"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Structured Ghost Slot Lines when few tasks */}
            {Array.from({ length: todayGhostCount }).map((_, idx) => (
              <div
                key={`ghost-${idx}`}
                className="h-11 rounded-xl border border-dashed border-[#E5E2D9]/80 flex items-center px-3.5 text-xs text-[#9E9B93] font-mono select-none"
              >
                + Empty execution slot
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Pinned Input Bar */}
        <form onSubmit={handleAddToday} className="pt-2">
          <div className="bg-[#F2F0EA] border border-[#DCD9D0] focus-within:border-[#111110] rounded-xl px-3.5 py-2.5 flex items-center gap-2 transition">
            <Plus size={14} className="text-[#686660] shrink-0" />
            <input
              type="text"
              placeholder="Add what you did..."
              value={newTodayTitle}
              onChange={(e) => setNewTodayTitle(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#111110] placeholder:text-[#9E9B93] outline-none"
            />
            {newTodayTitle.trim() && (
              <button
                type="button"
                onClick={() => setNewTodayGoal(!newTodayGoal)}
                className={`p-1 rounded transition-colors ${
                  newTodayGoal ? 'text-[#E5391A]' : 'text-[#9E9B93] hover:text-[#111110]'
                }`}
                title="Link to goal"
              >
                <Target size={13} />
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ============================================================== */}
      {/* CARD 4: TOMORROW'S QUEUE (5 PHYSICAL SLOTS) */}
      {/* ============================================================== */}
      <section className="bg-[#FAF9F6] border border-[#DCD9D0] rounded-2xl p-6 flex flex-col justify-between min-h-[540px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD9D0]">
            <h2 className="text-xl font-semibold tracking-tight text-[#111110]">
              Tomorrow
            </h2>

            {/* 5-pip visual slot indicator */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#686660]">
                {tomorrowCount}/5 MAX
              </span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((slotIdx) => (
                  <span
                    key={slotIdx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      slotIdx < tomorrowCount ? 'bg-[#111110]' : 'bg-[#DCD9D0]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 5 Physical Priority Slots (Always render all 5!) */}
          <div className="my-4 flex flex-col gap-2.5">
            {[0, 1, 2, 3, 4].map((slotIndex) => {
              const task = tomorrowTasks?.[slotIndex];
              const slotNumberStr = String(slotIndex + 1).padStart(2, '0');

              if (task) {
                return (
                  <div
                    key={task.id}
                    className="group min-h-[52px] bg-[#F2F0EA] border border-[#DCD9D0] rounded-xl px-4 py-3 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <span className="font-mono text-xs font-semibold text-[#686660]">
                        {slotNumberStr}
                      </span>
                      <p className="text-xs text-[#111110] font-medium truncate">
                        {task.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.linkedToGoal && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#E5391A]"
                          title="Linked to goal"
                        />
                      )}
                      <button
                        onClick={() => toggleGoalLink(task.id)}
                        className={`p-1 transition-colors ${
                          task.linkedToGoal ? 'text-[#E5391A]' : 'text-[#9E9B93] hover:text-[#111110]'
                        }`}
                        title="Toggle goal"
                      >
                        <Target size={12} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#9E9B93] hover:text-[#111110] p-1 transition-opacity"
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
                  className="min-h-[52px] bg-[#F2F0EA]/40 border border-dashed border-[#E2E0D8] rounded-xl px-4 py-3 flex items-center text-xs font-mono text-[#9E9B93] select-none"
                >
                  {slotNumberStr} // AVAILABLE PRIORITY SLOT
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Pinned Input Bar */}
        <form onSubmit={handleAddTomorrow} className="pt-2">
          {!isTomorrowFull ? (
            <div className="bg-[#F2F0EA] border border-[#DCD9D0] focus-within:border-[#111110] rounded-xl px-3.5 py-2.5 flex items-center gap-2 transition">
              <Plus size={14} className="text-[#686660] shrink-0" />
              <input
                type="text"
                placeholder="Plan for tomorrow..."
                value={newTomorrowTitle}
                onChange={(e) => setNewTomorrowTitle(e.target.value)}
                className="flex-1 bg-transparent text-xs text-[#111110] placeholder:text-[#9E9B93] outline-none"
              />
              {newTomorrowTitle.trim() && (
                <button
                  type="button"
                  onClick={() => setNewTomorrowGoal(!newTomorrowGoal)}
                  className={`p-1 rounded transition-colors ${
                    newTomorrowGoal ? 'text-[#E5391A]' : 'text-[#9E9B93] hover:text-[#111110]'
                  }`}
                  title="Link to goal"
                >
                  <Target size={13} />
                </button>
              )}
            </div>
          ) : (
            <div className="h-10 flex items-center justify-center text-xs text-[#686660] font-mono bg-[#F2F0EA] rounded-xl border border-[#DCD9D0]">
              5/5 Priority slots filled
            </div>
          )}
        </form>
      </section>
    </div>
  );
};
