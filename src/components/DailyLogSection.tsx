import React, { useState } from 'react';
import { db, TaskItem } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDailyRollover } from '../hooks/useDailyRollover';
import { Target, X } from 'lucide-react';

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

  // Live queries for tasks on the selected date
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

  // Inline input states
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
    <section className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 pt-2">
      {/* ============================================================== */}
      {/* LEFT COLUMN: TODAY */}
      {/* ============================================================== */}
      <div className="flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-divider mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Today
            </h2>
            <span className="font-mono text-xs text-muted">
              {todayCompletedCount}/{todayTotalCount}
            </span>
          </div>

          {/* Task List */}
          <div className="space-y-1 mb-2">
            {todayTasks && todayTasks.map((task: TaskItem) => (
              <div
                key={task.id}
                className="group flex items-start justify-between py-1.5 px-1 rounded hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="minimal-checkbox mt-0.5 shrink-0"
                    title={task.completed ? 'Mark uncompleted' : 'Mark completed'}
                  />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-relaxed break-words transition-all ${
                        task.completed ? 'line-through text-muted/70' : 'text-ink'
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {/* Stale Badge (>= 3 times) */}
                    {!task.completed && task.rolloverCount >= 3 && (
                      <span
                        className="font-mono text-[10px] text-amber font-medium px-1 rounded bg-amber/10"
                        title={`Rolled over ${task.rolloverCount} days`}
                      >
                        {task.rolloverCount}d
                      </span>
                    )}

                    {/* Goal dot */}
                    {task.linkedToGoal && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-vermilion shrink-0"
                        title="Linked to goal"
                      />
                    )}

                    {/* Done timestamp */}
                    {task.completed && task.completedAt && (
                      <span className="font-mono text-[10px] text-muted">
                        {task.completedAt}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtle Action (Delete) */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-subtle hover:text-ink p-0.5 transition-opacity"
                  title="Delete"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Borderless Inline Input for Today */}
        <form onSubmit={handleAddToday} className="relative mt-2">
          <div className="flex items-center gap-2 border-b border-transparent focus-within:border-ink/20 transition-colors py-1">
            <span className="text-subtle text-xs select-none">+</span>
            <input
              type="text"
              placeholder="Add what you did..."
              value={newTodayTitle}
              onChange={(e) => setNewTodayTitle(e.target.value)}
              className="flex-1 bg-transparent text-xs text-ink placeholder:text-subtle outline-none"
            />
            {newTodayTitle.trim() && (
              <button
                type="button"
                onClick={() => setNewTodayGoal(!newTodayGoal)}
                className={`p-1 rounded transition-colors ${
                  newTodayGoal ? 'text-vermilion' : 'text-subtle hover:text-ink'
                }`}
                title="Toggle Goal Link"
              >
                <Target size={12} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: TOMORROW (MAX 5) */}
      {/* ============================================================== */}
      <div className="flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-divider mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Tomorrow
            </h2>
            <span className="font-mono text-xs text-muted">
              {tomorrowCount}/5 max
            </span>
          </div>

          {/* Tomorrow List */}
          <div className="space-y-1 mb-2">
            {tomorrowTasks && tomorrowTasks.map((task: TaskItem) => (
              <div
                key={task.id}
                className="group flex items-center justify-between py-1.5 px-1 rounded hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-divider shrink-0" />
                  <p className="text-xs text-ink truncate leading-relaxed">
                    {task.title}
                  </p>
                  {task.linkedToGoal && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-vermilion shrink-0"
                      title="Linked to goal"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleGoalLink(task.id)}
                    className={`p-0.5 transition-colors ${
                      task.linkedToGoal ? 'text-vermilion' : 'text-subtle hover:text-ink'
                    }`}
                    title="Toggle goal"
                  >
                    <Target size={11} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-subtle hover:text-ink p-0.5 transition-colors"
                    title="Delete"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Borderless Inline Input for Tomorrow */}
        <form onSubmit={handleAddTomorrow} className="relative mt-2">
          {!isTomorrowFull ? (
            <div className="flex items-center gap-2 border-b border-transparent focus-within:border-ink/20 transition-colors py-1">
              <span className="text-subtle text-xs select-none">+</span>
              <input
                type="text"
                placeholder="Plan for tomorrow (max 5)..."
                value={newTomorrowTitle}
                onChange={(e) => setNewTomorrowTitle(e.target.value)}
                className="flex-1 bg-transparent text-xs text-ink placeholder:text-subtle outline-none"
              />
              {newTomorrowTitle.trim() && (
                <button
                  type="button"
                  onClick={() => setNewTomorrowGoal(!newTomorrowGoal)}
                  className={`p-1 rounded transition-colors ${
                    newTomorrowGoal ? 'text-vermilion' : 'text-subtle hover:text-ink'
                  }`}
                  title="Toggle Goal Link"
                >
                  <Target size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-muted py-1">
              Tomorrow queue is full (5/5).
            </div>
          )}
        </form>
      </div>
    </section>
  );
};
