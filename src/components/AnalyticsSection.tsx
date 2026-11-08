import React, { useState, useEffect } from 'react';
import { db, DayRecord, GoalRecord, getLocalDateKey, calculateSleepMinutes, formatSleepDuration } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon } from 'lucide-react';

interface AnalyticsSectionProps {
  selectedDateKey: string;
  onSelectDateKey?: (dateKey: string) => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  selectedDateKey,
  onSelectDateKey,
}) => {
  const [hoveredBarcodeDay, setHoveredBarcodeDay] = useState<string | null>(null);

  // Live queries
  const allDays = useLiveQuery(() => db.days.toArray(), []);
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);

  const shortTermGoal = goals?.find((g) => g.id === 'short_term');
  const longTermGoal = goals?.find((g) => g.id === 'long_term');

  const currentDayRecord = useLiveQuery(
    () => db.days.get(selectedDateKey),
    [selectedDateKey]
  );

  // Sleep states
  const [sleepTime, setSleepTime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');

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

  // 14 Past Dates
  const past14DateKeys: string[] = [];
  const baseDate = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    past14DateKeys.push(getLocalDateKey(d));
  }

  const dayMap = new Map<string, DayRecord>();
  allDays?.forEach((d) => dayMap.set(d.dateKey, d));

  // Checkbox Completion Rate
  const todayTasks = allTasks?.filter((t) => t.dateKey === selectedDateKey && t.listType === 'today') || [];
  const todayTotal = todayTasks.length;
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const past7Keys = past14DateKeys.slice(7);
  const past7Tasks = allTasks?.filter((t) => past7Keys.includes(t.dateKey) && t.listType === 'today') || [];
  const past7Total = past7Tasks.length;
  const past7Completed = past7Tasks.filter((t) => t.completed).length;
  const past7Rate = past7Total > 0 ? Math.round((past7Completed / past7Total) * 100) : 0;

  // 14-Day Trend Data
  const barcodeData = past14DateKeys.map((dateKey) => {
    const day = dayMap.get(dateKey);
    const focusedHours = day ? day.focusedSeconds / 3600 : 0;
    const distractedHours = day ? day.distractedSeconds / 3600 : 0;
    const totalHours = focusedHours + distractedHours;

    const [,, d] = dateKey.split('-');
    return {
      dateKey,
      dayNumber: d,
      focusedHours,
      distractedHours,
      totalHours,
    };
  });

  const maxSessionHours = Math.max(8, ...barcodeData.map((d) => d.totalHours));
  const activeHoverData = barcodeData.find((d) => d.dateKey === hoveredBarcodeDay);

  // Sleep Save Handler
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

  // Goal Days Remaining
  const calculateDaysRemaining = (targetDateStr: string | undefined): string => {
    if (!targetDateStr) return '0D';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diffDays > 0) return `${diffDays}D LEFT`;
    if (diffDays === 0) return 'DUE TODAY';
    return `${Math.abs(diffDays)}D OVERDUE`;
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

  // SVG Circular Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (todayRate / 100) * circumference;

  return (
    <div className="w-full grid grid-cols-12 gap-4 my-auto animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* WIDGET 1: TIME OF SLEEP & TIME OF WAKEUP (NOTHING CLOCK WIDGET) */}
      {/* ============================================================== */}
      <div className="col-span-12 md:col-span-6 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[220px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-ndot uppercase tracking-widest text-white/50 font-bold flex items-center gap-1.5">
            <Moon size={12} className="text-[#D71921]" />
            SLEEP TELEMETRY
          </span>
          <span className="text-[10px] font-ndot uppercase text-white/40">
            CIRCADIAN LOG
          </span>
        </div>

        {/* Big NDot Sleep Duration Readout */}
        <div className="my-2">
          <div className="font-ndot text-5xl tracking-wider text-white tabular-nums">
            {formatSleepDuration(calculatedSleepMin)}
          </div>
          <span className="text-[11px] text-white/40 font-ndot uppercase">
            TOTAL REST RECOVERY
          </span>
        </div>

        {/* Two Sleek Frosted Time Input Pills */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {/* Bed Time Pill */}
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between">
            <span className="text-[9px] font-ndot uppercase text-white/40 mb-1">
              TIME OF SLEEP
            </span>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => {
                setSleepTime(e.target.value);
                saveSleep(e.target.value, wakeTime);
              }}
              className="bg-transparent font-ndot text-sm text-white outline-none w-full cursor-pointer"
            />
          </div>

          {/* Wake Time Pill */}
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between">
            <span className="text-[9px] font-ndot uppercase text-white/40 mb-1">
              TIME OF WAKEUP
            </span>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => {
                setWakeTime(e.target.value);
                saveSleep(sleepTime, e.target.value);
              }}
              className="bg-transparent font-ndot text-sm text-white outline-none w-full cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 2: CHECKBOX COMPLETION RATE (NOTHING CIRCULAR PROGRESS GAUGE) */}
      {/* ============================================================== */}
      <div className="col-span-12 md:col-span-6 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[220px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-ndot uppercase tracking-widest text-white/50 font-bold">
            COMPLETION RATE
          </span>
          <span className="text-[10px] font-ndot uppercase text-white/40">
            7D AVG: {past7Rate}%
          </span>
        </div>

        {/* Center: Ring Gauge paired with NDot Percentage */}
        <div className="flex items-center justify-between my-2">
          <div>
            <div className="font-ndot text-5xl tracking-wider text-white tabular-nums">
              {todayRate}%
            </div>
            <span className="text-[11px] text-white/40 font-ndot uppercase">
              {todayCompleted}/{todayTotal} TASKS DELIVERED
            </span>
          </div>

          {/* SVG Circular Ring Gauge */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-white/10"
                strokeWidth="8"
                fill="none"
              />
              {/* Active Progress Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-[#D71921] transition-all duration-700 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="absolute font-ndot text-xs text-white/80">
              {todayRate}%
            </span>
          </div>
        </div>

        {/* Bottom 7-Day Average Bar */}
        <div className="pt-2">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-500"
              style={{ width: `${past7Rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 3: SHORT-TERM & LONG-TERM GOALS (DUAL FROSTED CARD ROW) */}
      {/* ============================================================== */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Short-Term Goal Card */}
        <div className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-ndot uppercase tracking-widest text-white/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D71921]" />
              SHORT-TERM MILESTONE
            </span>
            <span className="font-ndot text-[10px] bg-[#D71921] text-white px-2.5 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(215,25,33,0.4)]">
              {calculateDaysRemaining(shortTermGoal?.targetDate)}
            </span>
          </div>

          {editingGoalId === 'short_term' ? (
            <div className="flex flex-col gap-2 pt-1">
              <input
                type="text"
                value={goalTitleInput}
                onChange={(e) => setGoalTitleInput(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="date"
                  value={goalDateInput}
                  onChange={(e) => setGoalDateInput(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 font-ndot text-xs text-white/70 outline-none"
                />
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveGoal} className="px-3 py-1 bg-[#D71921] rounded-xl text-white text-xs font-medium">
                    Save
                  </button>
                  <button onClick={() => setEditingGoalId(null)} className="px-2 py-1 text-white/50 hover:text-white text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => handleStartEditGoal(shortTermGoal, 'short_term')}
              className="cursor-pointer group py-1"
            >
              <p className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                {shortTermGoal?.title || 'Ship Core Prototype'}
              </p>
              <span className="text-[10px] text-white/40 font-ndot uppercase mt-1 block">
                Tap to calibrate target date
              </span>
            </div>
          )}
        </div>

        {/* Long-Term Goal Card */}
        <div className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-ndot uppercase tracking-widest text-white/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              LONG-TERM VISION
            </span>
            <span className="font-ndot text-[10px] bg-white/10 border border-white/15 text-white/80 px-2.5 py-0.5 rounded-full font-bold">
              {calculateDaysRemaining(longTermGoal?.targetDate)}
            </span>
          </div>

          {editingGoalId === 'long_term' ? (
            <div className="flex flex-col gap-2 pt-1">
              <input
                type="text"
                value={goalTitleInput}
                onChange={(e) => setGoalTitleInput(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="date"
                  value={goalDateInput}
                  onChange={(e) => setGoalDateInput(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 font-ndot text-xs text-white/70 outline-none"
                />
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveGoal} className="px-3 py-1 bg-[#D71921] rounded-xl text-white text-xs font-medium">
                    Save
                  </button>
                  <button onClick={() => setEditingGoalId(null)} className="px-2 py-1 text-white/50 hover:text-white text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => handleStartEditGoal(longTermGoal, 'long_term')}
              className="cursor-pointer group py-1"
            >
              <p className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                {longTermGoal?.title || 'Production Telemetry Suite'}
              </p>
              <span className="text-[10px] text-white/40 font-ndot uppercase mt-1 block">
                Tap to calibrate target date
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 4: 14-DAY FOCUS VS. DISTRACTED TREND (SMOKED GLASS CARD) */}
      {/* ============================================================== */}
      <div className="col-span-12 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-ndot uppercase tracking-widest text-white/50 font-bold">
            14-DAY TELEMETRY TREND
          </span>

          <div className="flex items-center gap-3 text-[10px] font-ndot">
            <span className="flex items-center gap-1.5 text-white/90">
              <span className="w-2 h-2 rounded-full bg-[#D71921]" /> FOCUSED
            </span>
            <span className="flex items-center gap-1.5 text-white/40">
              <span className="w-2 h-2 rounded-full bg-white/30" /> DRIFT
            </span>
          </div>
        </div>

        {/* 14 Vertical Pill Tracks in Pure Nothing OS Palette */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 h-36 flex items-end justify-between gap-1.5">
          {barcodeData.map((d) => {
            const focusedPct = (d.focusedHours / maxSessionHours) * 100;
            const distractedPct = (d.distractedHours / maxSessionHours) * 100;
            const isSelected = d.dateKey === selectedDateKey;

            return (
              <div
                key={d.dateKey}
                onClick={() => onSelectDateKey?.(d.dateKey)}
                onMouseEnter={() => setHoveredBarcodeDay(d.dateKey)}
                onMouseLeave={() => setHoveredBarcodeDay(null)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                title={`${d.dateKey}: ${d.focusedHours.toFixed(1)}h focus, ${d.distractedHours.toFixed(1)}h drift`}
              >
                {/* Vertical Full-Height Architectural Track */}
                <div
                  className={`w-full h-full rounded-full relative overflow-hidden flex flex-col justify-end transition-all ${
                    isSelected
                      ? 'ring-1 ring-white bg-white/20'
                      : 'bg-white/[0.06] group-hover:bg-white/[0.12]'
                  }`}
                >
                  {/* Distracted Segment (Frosted White) */}
                  {distractedPct > 0 && (
                    <div
                      className="w-full bg-white/25 rounded-t-full"
                      style={{ height: `${distractedPct}%` }}
                    />
                  )}
                  {/* Focused Segment (Nothing Crimson) */}
                  {focusedPct > 0 && (
                    <div
                      className={`w-full bg-[#D71921] ${distractedPct === 0 ? 'rounded-t-full' : ''}`}
                      style={{ height: `${focusedPct}%` }}
                    />
                  )}
                </div>

                {/* Day Number */}
                <span
                  className={`mt-1.5 font-ndot text-[9px] ${
                    isSelected ? 'text-white font-bold' : 'text-white/40 group-hover:text-white'
                  }`}
                >
                  {d.dayNumber}
                </span>
              </div>
            );
          })}
        </div>

        {activeHoverData && (
          <div className="mt-3 text-right text-xs font-ndot text-white/70">
            {activeHoverData.dateKey}: <span className="text-[#D71921] font-bold">{activeHoverData.focusedHours.toFixed(1)}H FOCUSED</span> · <span className="text-white/40">{activeHoverData.distractedHours.toFixed(1)}H DRIFT</span>
          </div>
        )}
      </div>
    </div>
  );
};
