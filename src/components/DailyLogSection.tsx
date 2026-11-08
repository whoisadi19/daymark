import React, { useState } from 'react';
import { db, TaskItem } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDailyRollover } from '../hooks/useDailyRollover';
import { Plus, Trash2, Target, AlertTriangle, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audio';

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
    triggerManualRollover,
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

  // Local inputs
  const [newTodayTitle, setNewTodayTitle] = useState('');
  const [newTodayLinkedGoal, setNewTodayLinkedGoal] = useState(false);

  const [newTomorrowTitle, setNewTomorrowTitle] = useState('');
  const [newTomorrowLinkedGoal, setNewTomorrowLinkedGoal] = useState(false);
  const [tomorrowError, setTomorrowError] = useState<string | null>(null);

  // Handlers
  const handleAddToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodayTitle.trim()) return;
    await addTodayTask(newTodayTitle, newTodayLinkedGoal);
    setNewTodayTitle('');
    setNewTodayLinkedGoal(false);
  };

  const handleAddTomorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTomorrowTitle.trim()) return;
    const success = await addTomorrowTask(newTomorrowTitle, newTomorrowLinkedGoal);
    if (success) {
      setNewTomorrowTitle('');
      setNewTomorrowLinkedGoal(false);
      setTomorrowError(null);
    } else {
      setTomorrowError('Tomorrow queue is strictly capped at 5 high-impact items.');
      soundEngine.playKeyClick();
    }
  };

  const tomorrowCount = tomorrowTasks?.length || 0;
  const isTomorrowFull = tomorrowCount >= 5;

  const todayCompletedCount = todayTasks?.filter((t) => t.completed).length || 0;
  const todayTotalCount = todayTasks?.length || 0;
  const todayCompletionRate =
    todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 0;

  return (
    <section className="bg-canvas border-plate text-text-ink relative flex flex-col">
      {/* Monospace Stamped Plate Header */}
      <div className="flex flex-wrap items-center justify-between border-plate-b bg-panel px-4 py-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-text-primary inline-block"></span>
          <span className="font-mono text-xs font-bold tracking-widest uppercase">
            SEC.01 // DAILY LOG &amp; EXECUTION STANDUP
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              triggerManualRollover();
            }}
            className="btn-mechanical text-[10px] py-0.5 px-2 flex items-center gap-1"
            title="Inspect previous day and pull uncompleted items"
          >
            <Sparkles size={11} className="text-ochre-amber" />
            <span>FORCE ROLLOVER CHECK</span>
          </button>
          <span className="font-mono text-[11px] text-text-dim">
            DATE: <span className="font-bold text-text-primary">{selectedDateKey}</span>
          </span>
        </div>
      </div>

      {/* Main Grid: List 1 (Today's Execution) & List 2 (Tomorrow's Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-grid-line flex-1">
        {/* ============================================================== */}
        {/* LIST 1: WHAT I DID TODAY (EXECUTION CHECKLIST) */}
        {/* ============================================================== */}
        <div className="p-4 flex flex-col justify-between bg-canvas">
          <div>
            {/* Sub-header */}
            <div className="flex items-center justify-between border-plate-b pb-2 mb-3">
              <div>
                <span className="block font-mono text-[10px] text-text-dim uppercase tracking-wider">
                  SEC.01-A // EXECUTION CHECKLIST
                </span>
                <h3 className="font-serif text-lg font-bold text-text-primary">
                  What I Did Today
                </h3>
              </div>
              <div className="text-right">
                <span className="block font-mono text-[10px] text-text-dim uppercase">
                  PROGRESS
                </span>
                <span className="font-mono text-xs font-bold text-forest-olive">
                  {todayCompletedCount}/{todayTotalCount} ({todayCompletionRate}%)
                </span>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-2 mb-4 min-h-[140px]">
              {todayTasks && todayTasks.length > 0 ? (
                todayTasks.map((task: TaskItem) => (
                  <div
                    key={task.id}
                    className={`group flex items-start justify-between p-2 border border-grid-line bg-panel/70 transition-all ${
                      task.completed ? 'opacity-65 bg-panel/30' : 'hover:border-text-ink'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                      {/* Mechanical Sharp Checkbox */}
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="mech-checkbox mt-0.5 shrink-0"
                        title={task.completed ? 'Mark uncompleted' : 'Mark completed'}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          {/* Stale Rollover Badge (>= 3 times) */}
                          {!task.completed && task.rolloverCount >= 3 && (
                            <span
                              className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-ochre-amber text-white tracking-wider uppercase inline-flex items-center gap-1"
                              title={`Task has rolled over ${task.rolloverCount} times without completion`}
                            >
                              <AlertTriangle size={9} />
                              [STALE: {task.rolloverCount}D]
                            </span>
                          )}

                          {/* Rollover badge for 1-2 days */}
                          {!task.completed && task.rolloverCount > 0 && task.rolloverCount < 3 && (
                            <span className="font-mono text-[9px] px-1.5 py-0.2 bg-canvas border border-grid-line text-text-dim uppercase">
                              ROLL: +{task.rolloverCount}D
                            </span>
                          )}

                          {/* Goal Linked Badge */}
                          {task.linkedToGoal && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-braun-orange/15 text-braun-orange border border-braun-orange/40 uppercase">
                              [ST-GOAL]
                            </span>
                          )}

                          {/* Completion Time Stamp */}
                          {task.completed && task.completedAt && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-forest-olive/15 text-forest-olive border border-forest-olive/40 uppercase">
                              [DONE {task.completedAt}]
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-xs font-sans leading-snug break-words ${
                            task.completed ? 'line-through text-text-dim' : 'text-text-primary font-medium'
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>
                    </div>

                    {/* Task Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={() => toggleGoalLink(task.id)}
                        className={`p-1 text-[10px] font-mono border transition-colors ${
                          task.linkedToGoal
                            ? 'bg-braun-orange text-white border-braun-orange'
                            : 'bg-canvas text-text-dim border-grid-line hover:text-text-primary'
                        }`}
                        title="Toggle link to Short-Term Goal"
                      >
                        <Target size={11} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-[10px] font-mono text-text-dim hover:text-braun-orange border border-grid-line bg-canvas hover:border-braun-orange transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 border border-dashed border-grid-line text-center text-text-dim font-mono text-xs">
                  NO EXECUTION ITEMS RECORDED FOR TODAY.
                  <span className="block text-[10px] mt-1 text-text-muted">
                    Use input below or trigger rollover check.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ad-hoc item input for Today */}
          <form onSubmit={handleAddToday} className="pt-3 border-plate-t space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Log ad-hoc execution item..."
                value={newTodayTitle}
                onChange={(e) => setNewTodayTitle(e.target.value)}
                className="flex-1 bg-panel border border-grid-line px-3 py-1.5 text-xs font-sans text-text-primary placeholder:text-text-dim focus:outline-none focus:border-text-ink"
              />
              <button
                type="button"
                onClick={() => setNewTodayLinkedGoal(!newTodayLinkedGoal)}
                className={`btn-mechanical px-2 text-[10px] flex items-center gap-1 ${
                  newTodayLinkedGoal ? 'bg-braun-orange text-white border-braun-orange' : ''
                }`}
                title="Link this task to Short-Term Goal"
              >
                <Target size={12} />
                <span className="hidden sm:inline">GOAL</span>
              </button>
              <button
                type="submit"
                className="btn-mechanical-orange px-3 py-1.5 text-xs flex items-center gap-1 font-bold shrink-0"
              >
                <Plus size={13} />
                <span>ADD ITEM</span>
              </button>
            </div>
          </form>
        </div>

        {/* ============================================================== */}
        {/* LIST 2: WHAT I WILL DO TOMORROW (TOMORROW'S QUEUE - MAX 5) */}
        {/* ============================================================== */}
        <div className="p-4 flex flex-col justify-between bg-panel/30">
          <div>
            {/* Sub-header with Slot Counter */}
            <div className="flex items-center justify-between border-plate-b pb-2 mb-3">
              <div>
                <span className="block font-mono text-[10px] text-text-dim uppercase tracking-wider">
                  SEC.01-B // TOMORROW'S QUEUE (MAX 5 ITEMS)
                </span>
                <h3 className="font-serif text-lg font-bold text-text-primary">
                  What I Will Do Tomorrow
                </h3>
              </div>

              {/* Strict Slot Counter */}
              <div className="text-right">
                <span className="block font-mono text-[10px] text-text-dim uppercase">
                  SLOTS: {tomorrowCount}/5
                </span>
                {/* 5 Physical Segmented Slot Indicator Blocks */}
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  {[0, 1, 2, 3, 4].map((slotIdx) => (
                    <span
                      key={slotIdx}
                      className={`w-3 h-2.5 border transition-all ${
                        slotIdx < tomorrowCount
                          ? 'bg-text-primary border-text-primary'
                          : 'bg-canvas border-grid-line'
                      }`}
                      title={`Slot ${slotIdx + 1} of 5`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Tomorrow's Queue Items */}
            <div className="space-y-2 mb-4 min-h-[140px]">
              {tomorrowTasks && tomorrowTasks.length > 0 ? (
                tomorrowTasks.map((task: TaskItem, index: number) => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between p-2 border border-grid-line bg-canvas hover:border-text-ink transition-all"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                      {/* Monospace Slot Number */}
                      <span className="font-mono text-xs font-bold text-text-dim px-1.5 py-0.5 bg-panel border border-grid-line">
                        0{index + 1}.
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-sans font-medium text-text-primary truncate">
                            {task.title}
                          </p>
                          {task.linkedToGoal && (
                            <span className="font-mono text-[9px] font-bold px-1 py-0.2 bg-braun-orange/15 text-braun-orange border border-braun-orange/40 uppercase shrink-0">
                              [GOAL]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Task Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleGoalLink(task.id)}
                        className={`p-1 text-[10px] font-mono border transition-colors ${
                          task.linkedToGoal
                            ? 'bg-braun-orange text-white border-braun-orange'
                            : 'bg-panel text-text-dim border-grid-line hover:text-text-primary'
                        }`}
                        title="Toggle link to Short-Term Goal"
                      >
                        <Target size={11} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-[10px] font-mono text-text-dim hover:text-braun-orange border border-grid-line bg-panel hover:border-braun-orange transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 border border-dashed border-grid-line text-center text-text-dim font-mono text-xs">
                  TOMORROW'S QUEUE IS EMPTY.
                  <span className="block text-[10px] mt-1 text-text-muted">
                    Plan up to 5 critical execution items for the next day.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tomorrow Queue Form */}
          <form onSubmit={handleAddTomorrow} className="pt-3 border-plate-t space-y-2">
            {isTomorrowFull ? (
              <div className="p-2 bg-panel border border-ochre-amber/60 flex items-center gap-2 text-ochre-amber font-mono text-[11px] font-bold">
                <AlertTriangle size={14} className="shrink-0" />
                <span>[QUEUE CAPACITY REACHED // 5/5 MAX PRIORITY SLOTS]</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Plan item for tomorrow (max 5)..."
                  value={newTomorrowTitle}
                  onChange={(e) => setNewTomorrowTitle(e.target.value)}
                  disabled={isTomorrowFull}
                  className="flex-1 bg-canvas border border-grid-line px-3 py-1.5 text-xs font-sans text-text-primary placeholder:text-text-dim focus:outline-none focus:border-text-ink disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setNewTomorrowLinkedGoal(!newTomorrowLinkedGoal)}
                  disabled={isTomorrowFull}
                  className={`btn-mechanical px-2 text-[10px] flex items-center gap-1 disabled:opacity-50 ${
                    newTomorrowLinkedGoal ? 'bg-braun-orange text-white border-braun-orange' : ''
                  }`}
                  title="Link this planned item to Short-Term Goal"
                >
                  <Target size={12} />
                  <span className="hidden sm:inline">GOAL</span>
                </button>
                <button
                  type="submit"
                  disabled={isTomorrowFull}
                  className="btn-mechanical px-3 py-1.5 text-xs flex items-center gap-1 font-bold shrink-0 disabled:opacity-50"
                >
                  <Plus size={13} />
                  <span>ENQUEUE</span>
                </button>
              </div>
            )}
            {tomorrowError && (
              <p className="font-mono text-[10px] text-ochre-amber">{tomorrowError}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};
