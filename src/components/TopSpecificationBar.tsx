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
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const shortTermGoal = goals?.find((g) => g.id === 'short_term');
  const longTermGoal = goals?.find((g) => g.id === 'long_term');

  const currentDayRecord = useLiveQuery(
    () => db.days.get(selectedDateKey),
    [selectedDateKey]
  );

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

  // Goal inline editing state
  const [editingGoalId, setEditingGoalId] = useState<'short_term' | 'long_term' | null>(null);
  const [goalTitleInput, setGoalTitleInput] = useState<string>('');
  const [goalDateInput, setGoalDateInput] = useState<string>('');

  const todayKey = getLocalDateKey();
  const isToday = selectedDateKey === todayKey;

  const formattedDisplayDate = (() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  })();

  const navigateDay = (offset: number) => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() + offset);
    onSelectDateKey(getLocalDateKey(current));
  };

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

  const calculateDaysRemaining = (targetDateStr: string | undefined): string => {
    if (!targetDateStr) return '0d';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diffDays > 0) return `${diffDays}d`;
    if (diffDays === 0) return 'today';
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
    <header className="h-14 bg-[#FAF9F6] border border-[#DCD9D0] rounded-2xl px-4 md:px-5 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0">
      {/* Left: Brand + Date Pill Switcher */}
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5391A] shrink-0" />
          <span className="font-bold tracking-tight text-sm text-[#111110]">
            DAYMARK
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#DCD9D0] mx-3.5 hidden sm:block" />

        <div className="bg-[#F2F0EA] rounded-lg px-2 py-1 text-xs font-medium flex items-center gap-1.5 text-[#111110]">
          <button
            onClick={() => navigateDay(-1)}
            className="p-0.5 rounded hover:text-black hover:bg-black/5 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="px-1">{formattedDisplayDate}</span>
          <button
            onClick={() => navigateDay(1)}
            className="p-0.5 rounded hover:text-black hover:bg-black/5 transition-colors"
            title="Next Day"
          >
            <ChevronRight size={13} />
          </button>
          {!isToday && (
            <button
              onClick={() => onSelectDateKey(todayKey)}
              className="ml-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white text-[#686660] hover:text-[#111110] border border-[#DCD9D0] transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Center: Goals as Sleek Segmented Pills */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Short Term Pill */}
        {editingGoalId === 'short_term' ? (
          <div className="flex items-center gap-1.5 bg-white border border-[#DCD9D0] rounded-lg px-2.5 py-1 text-xs shadow-sm">
            <input
              type="text"
              value={goalTitleInput}
              onChange={(e) => setGoalTitleInput(e.target.value)}
              className="bg-transparent text-xs text-[#111110] outline-none w-36"
              autoFocus
            />
            <input
              type="date"
              value={goalDateInput}
              onChange={(e) => setGoalDateInput(e.target.value)}
              className="bg-transparent font-mono text-[11px] text-[#686660] outline-none"
            />
            <button onClick={handleSaveGoal} className="text-[#E5391A]">
              <Check size={13} />
            </button>
            <button onClick={() => setEditingGoalId(null)} className="text-[#9E9B93]">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleStartEditGoal(shortTermGoal, 'short_term')}
            className="bg-[#F2F0EA] hover:bg-[#EAE7DF] transition rounded-lg px-3 py-1 text-xs text-[#686660] flex items-center gap-2"
            title="Click to edit short-term goal"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5391A]" />
            <span className="text-[#111110] font-medium max-w-[150px] truncate">
              {shortTermGoal?.title || 'Ship Core Prototype'}
            </span>
            <span className="font-mono text-[10px] bg-[#111110] text-white px-1.5 py-0.2 rounded font-semibold">
              {calculateDaysRemaining(shortTermGoal?.targetDate)}
            </span>
          </button>
        )}

        {/* Long Term Pill */}
        {editingGoalId === 'long_term' ? (
          <div className="flex items-center gap-1.5 bg-white border border-[#DCD9D0] rounded-lg px-2.5 py-1 text-xs shadow-sm">
            <input
              type="text"
              value={goalTitleInput}
              onChange={(e) => setGoalTitleInput(e.target.value)}
              className="bg-transparent text-xs text-[#111110] outline-none w-36"
              autoFocus
            />
            <input
              type="date"
              value={goalDateInput}
              onChange={(e) => setGoalDateInput(e.target.value)}
              className="bg-transparent font-mono text-[11px] text-[#686660] outline-none"
            />
            <button onClick={handleSaveGoal} className="text-[#E5391A]">
              <Check size={13} />
            </button>
            <button onClick={() => setEditingGoalId(null)} className="text-[#9E9B93]">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleStartEditGoal(longTermGoal, 'long_term')}
            className="bg-[#F2F0EA] hover:bg-[#EAE7DF] transition rounded-lg px-3 py-1 text-xs text-[#686660] flex items-center gap-2"
            title="Click to edit long-term goal"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#686660]" />
            <span className="text-[#111110] font-medium max-w-[150px] truncate">
              {longTermGoal?.title || 'Production Telemetry Suite'}
            </span>
            <span className="font-mono text-[10px] bg-[#686660] text-white px-1.5 py-0.2 rounded font-semibold">
              {calculateDaysRemaining(longTermGoal?.targetDate)}
            </span>
          </button>
        )}
      </div>

      {/* Right: Sleep Pill + Settings Popover */}
      <div className="flex items-center gap-2">
        {!isEditingSleep ? (
          <button
            onClick={() => setIsEditingSleep(true)}
            className="bg-[#F2F0EA] hover:bg-[#EAE7DF] transition rounded-lg px-3 py-1 text-xs font-medium text-[#111110] flex items-center gap-2"
            title="Click to edit sleep hours"
          >
            <Moon size={12} className="text-[#686660]" />
            {sleepTime && wakeTime ? (
              <span>
                {sleepTime} → {wakeTime} <span className="text-[#686660] font-mono text-[11px]">({formatSleepDuration(calculatedSleepMin)})</span>
              </span>
            ) : (
              <span className="text-[#686660]">+ Sleep</span>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1 rounded-lg border border-[#DCD9D0] shadow-sm">
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => {
                setSleepTime(e.target.value);
                saveSleep(e.target.value, wakeTime);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingSleep(false)}
              className="bg-transparent font-mono text-xs text-[#111110] outline-none"
            />
            <span className="text-[#686660]">→</span>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => {
                setWakeTime(e.target.value);
                saveSleep(sleepTime, e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingSleep(false)}
              className="bg-transparent font-mono text-xs text-[#111110] outline-none"
            />
            <button
              onClick={() => setIsEditingSleep(false)}
              className="text-[#686660] hover:text-[#111110]"
              title="Done"
            >
              <Check size={12} />
            </button>
          </div>
        )}

        <SettingsPopover
          selectedDateKey={selectedDateKey}
          onDataRefresh={onDataResetOrSeed}
        />
      </div>
    </header>
  );
};
