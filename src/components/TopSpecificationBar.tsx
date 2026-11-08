import React, { useState, useEffect } from 'react';
import { db, GoalRecord, getLocalDateKey, calculateSleepMinutes, formatSleepDuration } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Moon, Check, X } from 'lucide-react';
import { SettingsPopover } from './SettingsPopover';

interface TopSpecificationBarProps {
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  onDataResetOrSeed: () => void;
}

export const TopSpecificationBar: React.FC<TopSpecificationBarProps> = ({
  selectedDateKey,
  onSelectDateKey,
  onDataResetOrSeed,
}) => {
  // Live query for goals
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const shortTermGoal = goals?.find(g => g.id === 'short_term');
  const longTermGoal = goals?.find(g => g.id === 'long_term');

  // Live query for selected day's record (sleep times)
  const currentDayRecord = useLiveQuery(
    () => db.days.get(selectedDateKey),
    [selectedDateKey]
  );

  // Sleep states
  const [sleepTime, setSleepTime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [isEditingSleep, setIsEditingSleep] = useState<boolean>(false);

  useEffect(() => {
    if (currentDayRecord) {
      setSleepTime(currentDayRecord.sleepTime || '');
      setWakeTime(currentDayRecord.wakeTime || '');
    } else {
      setSleepTime('');
      setWakeTime('');
    }
  }, [currentDayRecord, selectedDateKey]);

  // Goal inline edit state
  const [editingGoalId, setEditingGoalId] = useState<'short_term' | 'long_term' | null>(null);
  const [goalTitleInput, setGoalTitleInput] = useState<string>('');
  const [goalDateInput, setGoalDateInput] = useState<string>('');

  const todayKey = getLocalDateKey();
  const isToday = selectedDateKey === todayKey;

  // Date formatted: "Sun, Nov 8"
  const formattedDisplayDate = (() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  })();

  // Navigate Date
  const navigateDay = (offset: number) => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() + offset);
    onSelectDateKey(getLocalDateKey(current));
  };

  // Sleep update handler
  const saveSleep = async (newSleep: string, newWake: string) => {
    const duration = calculateSleepMinutes(newSleep, newWake);
    const existing = await db.days.get(selectedDateKey);
    await db.days.put({
      dateKey: selectedDateKey,
      sleepTime: newSleep,
      wakeTime: newWake,
      sleepDurationMin: duration,
      focusedSeconds: existing?.focusedSeconds || 0,
      distractedSeconds: existing?.distractedSeconds || 0,
      updatedAt: Date.now(),
    });
  };

  // Goal countdown calculations
  const calculateDaysRemaining = (targetDateStr: string | undefined): string => {
    if (!targetDateStr) return 'no date';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays > 0) return `${diffDays}d left`;
    if (diffDays === 0) return 'due today';
    return `${Math.abs(diffDays)}d overdue`;
  };

  const handleStartEditGoal = (goal: GoalRecord | undefined, id: 'short_term' | 'long_term') => {
    setEditingGoalId(id);
    setGoalTitleInput(goal?.title || (id === 'short_term' ? 'Ship Core Prototype' : 'Production Telemetry Suite'));
    setGoalDateInput(goal?.targetDate || getLocalDateKey(new Date(Date.now() + (id === 'short_term' ? 14 : 90) * 86400000)));
  };

  const handleSaveGoal = async () => {
    if (!editingGoalId) return;
    await db.goals.put({
      id: editingGoalId,
      title: goalTitleInput.trim() || (editingGoalId === 'short_term' ? 'Short-Term Target' : 'Long-Term Vision'),
      targetDate: goalDateInput,
      updatedAt: Date.now(),
    });
    setEditingGoalId(null);
  };

  const calculatedSleepMin = calculateSleepMinutes(sleepTime, wakeTime);

  return (
    <header className="w-full space-y-3 pb-2 border-b border-divider">
      {/* 1 Clean Row: Logo + Date Navigator (Left) & Inline Sleep + Settings (Right) */}
      <div className="flex items-center justify-between">
        {/* Left: Brand + Date Switcher */}
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sm tracking-tight text-ink uppercase">
            DAYMARK
          </span>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <button
              onClick={() => navigateDay(-1)}
              className="p-1 rounded hover:text-ink hover:bg-black/5 transition-colors"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium text-ink px-1">{formattedDisplayDate}</span>
            <button
              onClick={() => navigateDay(1)}
              className="p-1 rounded hover:text-ink hover:bg-black/5 transition-colors"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight size={14} />
            </button>

            {!isToday && (
              <button
                onClick={() => onSelectDateKey(todayKey)}
                className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-muted hover:text-ink hover:bg-black/10 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Right: Inline Sleep Pill + Settings ⚙ */}
        <div className="flex items-center gap-3">
          {/* Clean Inline Sleep Pill */}
          {!isEditingSleep ? (
            <button
              onClick={() => setIsEditingSleep(true)}
              className="text-xs text-muted hover:text-ink flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-black/5 transition-colors"
              title="Click to edit sleep hours"
            >
              <Moon size={12} className="text-muted" />
              {sleepTime && wakeTime ? (
                <span>
                  Sleep <span className="font-mono text-ink">{sleepTime}</span> → <span className="font-mono text-ink">{wakeTime}</span>{' '}
                  <span className="text-muted font-mono">({formatSleepDuration(calculatedSleepMin)})</span>
                </span>
              ) : (
                <span className="text-subtle">+ Log sleep</span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1 rounded-full border border-divider shadow-sm">
              <span className="text-muted text-[11px]">Sleep</span>
              <input
                type="time"
                value={sleepTime}
                onChange={(e) => {
                  setSleepTime(e.target.value);
                  saveSleep(e.target.value, wakeTime);
                }}
                className="bg-transparent font-mono text-xs text-ink outline-none"
              />
              <span className="text-muted">→</span>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => {
                  setWakeTime(e.target.value);
                  saveSleep(sleepTime, e.target.value);
                }}
                className="bg-transparent font-mono text-xs text-ink outline-none"
              />
              <button
                onClick={() => setIsEditingSleep(false)}
                className="ml-1 text-muted hover:text-ink"
                title="Done"
              >
                <Check size={12} />
              </button>
            </div>
          )}

          {/* Settings Popover */}
          <SettingsPopover
            selectedDateKey={selectedDateKey}
            onDataRefresh={onDataResetOrSeed}
          />
        </div>
      </div>

      {/* Sub-row: Clickable Text Goals Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted">
        {/* Short-term goal */}
        {editingGoalId === 'short_term' ? (
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-divider shadow-sm">
            <input
              type="text"
              value={goalTitleInput}
              onChange={(e) => setGoalTitleInput(e.target.value)}
              placeholder="Short-term milestone..."
              className="bg-transparent text-ink text-xs outline-none w-48"
              autoFocus
            />
            <input
              type="date"
              value={goalDateInput}
              onChange={(e) => setGoalDateInput(e.target.value)}
              className="bg-transparent font-mono text-[11px] text-muted outline-none"
            />
            <button onClick={handleSaveGoal} className="text-vermilion hover:opacity-80">
              <Check size={13} />
            </button>
            <button onClick={() => setEditingGoalId(null)} className="text-muted hover:text-ink">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleStartEditGoal(shortTermGoal, 'short_term')}
            className="group flex items-center gap-1.5 hover:text-ink transition-colors text-left"
            title="Click to edit short-term goal"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-vermilion inline-block" />
            <span>Short-term:</span>
            <span className="text-ink font-medium underline decoration-transparent group-hover:decoration-muted underline-offset-2 transition-all">
              {shortTermGoal?.title || 'Ship Core Prototype'}
            </span>
            <span className="text-muted font-mono text-[11px]">
              · {calculateDaysRemaining(shortTermGoal?.targetDate)}
            </span>
          </button>
        )}

        {/* Long-term goal */}
        {editingGoalId === 'long_term' ? (
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-divider shadow-sm">
            <input
              type="text"
              value={goalTitleInput}
              onChange={(e) => setGoalTitleInput(e.target.value)}
              placeholder="Long-term vision..."
              className="bg-transparent text-ink text-xs outline-none w-48"
              autoFocus
            />
            <input
              type="date"
              value={goalDateInput}
              onChange={(e) => setGoalDateInput(e.target.value)}
              className="bg-transparent font-mono text-[11px] text-muted outline-none"
            />
            <button onClick={handleSaveGoal} className="text-vermilion hover:opacity-80">
              <Check size={13} />
            </button>
            <button onClick={() => setEditingGoalId(null)} className="text-muted hover:text-ink">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleStartEditGoal(longTermGoal, 'long_term')}
            className="group flex items-center gap-1.5 hover:text-ink transition-colors text-left"
            title="Click to edit long-term goal"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted/60 inline-block" />
            <span>Long-term:</span>
            <span className="text-ink font-medium underline decoration-transparent group-hover:decoration-muted underline-offset-2 transition-all">
              {longTermGoal?.title || 'Production Telemetry Suite'}
            </span>
            <span className="text-muted font-mono text-[11px]">
              · {calculateDaysRemaining(longTermGoal?.targetDate)}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
