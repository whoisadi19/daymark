import React, { useState, useEffect } from 'react';
import {
  db,
  DayRecord,
  getLocalDateKey,
  calculateSleepMinutes,
  formatSleepDuration,
  getSleepScheduleConfig,
  saveSleepScheduleConfig,
  calculateSleepShiftForDate,
  formatTime12Hour,
  renderAsciiProgressBar,
  SleepScheduleConfig,
} from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, ArrowRight, Sliders, CheckCircle2 } from 'lucide-react';

interface AnalyticsSectionProps {
  selectedDateKey: string;
  onSelectDateKey?: (dateKey: string) => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  selectedDateKey,
  onSelectDateKey,
}) => {
  const [hoveredBarcodeDay, setHoveredBarcodeDay] = useState<string | null>(null);

  // Sleep Schedule Config
  const [sleepConfig, setSleepConfig] = useState<SleepScheduleConfig>(() => getSleepScheduleConfig());
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Form states for config editing
  const [baseSleepInput, setBaseSleepInput] = useState(sleepConfig.baselineSleepTime);
  const [baseWakeInput, setBaseWakeInput] = useState(sleepConfig.baselineWakeTime);
  const [targetSleepInput, setTargetSleepInput] = useState(sleepConfig.targetSleepTime);
  const [targetWakeInput, setTargetWakeInput] = useState(sleepConfig.targetWakeTime);
  const [shiftStepInput, setShiftStepInput] = useState(sleepConfig.shiftMinutesPerDay);

  // Live queries
  const allDays = useLiveQuery(() => db.days.toArray(), []);
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);

  const currentDayRecord = useLiveQuery(
    () => db.days.get(selectedDateKey),
    [selectedDateKey]
  );

  // Sleep states for selected date
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
    const [, , d] = dateKey.split('-');
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

  const handleSaveSleepConfig = () => {
    const updated: SleepScheduleConfig = {
      ...sleepConfig,
      baselineSleepTime: baseSleepInput,
      baselineWakeTime: baseWakeInput,
      targetSleepTime: targetSleepInput,
      targetWakeTime: targetWakeInput,
      shiftMinutesPerDay: Number(shiftStepInput) || 15,
    };
    saveSleepScheduleConfig(updated);
    setSleepConfig(updated);
    setIsEditingConfig(false);
  };

  const calculatedSleepMin = calculateSleepMinutes(sleepTime, wakeTime);

  // Shift Calculations for tonight
  const shiftStats = calculateSleepShiftForDate(sleepConfig, selectedDateKey);

  // SVG Circular Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (todayRate / 100) * circumference;

  // 7-Day Sleep Schedule Graph Data
  const weeklySleepData = past7Keys.map((dKey) => {
    const day = dayMap.get(dKey);
    const [y, m, d] = dKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = dateObj.getDate();

    const sleepT = day?.sleepTime || '';
    const wakeT = day?.wakeTime || '';
    const durationMin = day?.sleepDurationMin || 0;

    return {
      dateKey: dKey,
      dayLabel: `${dayName} ${dayNum}`,
      sleepTime: sleepT,
      wakeTime: wakeT,
      durationMin,
      wake12: wakeT ? formatTime12Hour(wakeT) : '—',
      sleep12: sleepT ? formatTime12Hour(sleepT) : '—',
    };
  });

  return (
    <div className="w-full grid grid-cols-12 gap-4 my-auto animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* WIDGET 1: SLEEP & WAKE LOG (PLAIN ENGLISH) */}
      {/* ============================================================== */}
      <div className="col-span-12 md:col-span-6 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[220px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold flex items-center gap-1.5">
            <Moon size={12} className="text-[#D71921]" />
            SLEEP &amp; WAKE LOG
          </span>
          <span className="text-[10px] font-mono uppercase text-white/40">
            {selectedDateKey}
          </span>
        </div>

        {/* Big Razor-Sharp Sleep Duration Readout */}
        <div className="my-2">
          <div className="font-mono text-5xl font-light tracking-tight text-white tabular-nums">
            {formatSleepDuration(calculatedSleepMin)}
          </div>
          <span className="text-[11px] text-white/40 font-mono uppercase">
            Total Sleep Duration
          </span>
        </div>

        {/* Two Sleek Frosted Time Input Pills */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {/* Bed Time Pill */}
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between">
            <span className="text-[9px] font-mono uppercase text-white/40 mb-1">
              Time of Sleep
            </span>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => {
                setSleepTime(e.target.value);
                saveSleep(e.target.value, wakeTime);
              }}
              className="bg-transparent font-mono text-sm text-white outline-none w-full cursor-pointer"
            />
          </div>

          {/* Wake Time Pill */}
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between">
            <span className="text-[9px] font-mono uppercase text-white/40 mb-1">
              Time of Wakeup
            </span>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => {
                setWakeTime(e.target.value);
                saveSleep(sleepTime, e.target.value);
              }}
              className="bg-transparent font-mono text-sm text-white outline-none w-full cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 2: TASK COMPLETION (PLAIN ENGLISH & CIRCULAR GAUGE) */}
      {/* ============================================================== */}
      <div className="col-span-12 md:col-span-6 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4] flex flex-col justify-between min-h-[220px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#D71921]" />
            TASK COMPLETION
          </span>
          <span className="text-[10px] font-mono uppercase text-white/40">
            7d average: {past7Rate}%
          </span>
        </div>

        {/* Center: Ring Gauge paired with Monospace Percentage */}
        <div className="flex items-center justify-between my-2">
          <div>
            <div className="font-mono text-5xl font-light tracking-tight text-white tabular-nums">
              {todayRate}%
            </div>
            <span className="text-[11px] text-white/40 font-mono">
              {todayCompleted}/{todayTotal} tasks done today
            </span>
          </div>

          {/* SVG Circular Ring Gauge */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-white/10"
                strokeWidth="8"
                fill="none"
              />
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
            <span className="absolute font-mono text-xs text-white/80 font-bold">
              {todayRate}%
            </span>
          </div>
        </div>

        {/* Bottom 7-Day Average Bar with ASCII Block preview */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-500"
              style={{ width: `${past7Rate}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-white/40">
            {renderAsciiProgressBar(past7Rate, 6)}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 3: SLEEP SCHEDULE SHIFTER (SHORT-TERM & LONG-TERM) */}
      {/* ============================================================== */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: Short-Term Daily Shift */}
        <div className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D71921]" />
              SHORT-TERM DAILY SHIFT
            </span>
            <span className="font-mono text-[10px] bg-[#D71921] text-white px-2.5 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(215,25,33,0.4)]">
              {shiftStats.isTargetReached ? 'TARGET REACHED' : `${shiftStats.daysRemaining}D REMAINING`}
            </span>
          </div>

          <div className="my-2">
            <span className="text-[10px] font-mono uppercase text-white/40 block">Tonight's Target</span>
            <div className="font-mono text-2xl font-medium text-white flex items-center gap-2 my-1">
              <span>{formatTime12Hour(shiftStats.tonightSleepTime)}</span>
              <ArrowRight size={14} className="text-[#D71921]" />
              <span>{formatTime12Hour(shiftStats.tonightWakeTime)}</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Shifting <strong className="text-white font-mono">{sleepConfig.shiftMinutesPerDay}m earlier/day</strong> from baseline ({formatTime12Hour(sleepConfig.baselineSleepTime)} → {formatTime12Hour(sleepConfig.baselineWakeTime)}).
            </p>
          </div>

          <div className="pt-2 text-[10px] font-mono text-white/40 flex items-center justify-between border-t border-white/10 mt-3">
            <span>Progress: Day {shiftStats.diffDays} of {shiftStats.totalDaysNeeded}</span>
            <span>{renderAsciiProgressBar(Math.min(100, Math.round((shiftStats.diffDays / Math.max(1, shiftStats.totalDaysNeeded)) * 100)), 8)}</span>
          </div>
        </div>

        {/* Card B: Long-Term Sleep Target */}
        <div className="bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                LONG-TERM SLEEP TARGET
              </span>
              <button
                onClick={() => setIsEditingConfig(!isEditingConfig)}
                className="text-[10px] font-mono bg-white/10 hover:bg-white/15 px-2.5 py-0.5 rounded-full text-white/80 flex items-center gap-1 transition-colors"
              >
                <Sliders size={10} />
                <span>{isEditingConfig ? 'Cancel' : 'Edit Target'}</span>
              </button>
            </div>

            {!isEditingConfig ? (
              <div className="my-2">
                <span className="text-[10px] font-mono uppercase text-white/40 block">Ideal Consistent Schedule</span>
                <div className="font-mono text-2xl font-medium text-white flex items-center gap-2 my-1">
                  <span>{formatTime12Hour(sleepConfig.targetSleepTime)}</span>
                  <ArrowRight size={14} className="text-white/40" />
                  <span>{formatTime12Hour(sleepConfig.targetWakeTime)}</span>
                </div>
                <p className="text-xs text-white/60">
                  Fixed target: Sleep by <strong className="text-white">12:00 AM</strong>, wake up by <strong className="text-white">08:00 AM</strong> for an optimal 8-hour circadian rhythm.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block">Base Sleep</span>
                    <input
                      type="time"
                      value={baseSleepInput}
                      onChange={(e) => setBaseSleepInput(e.target.value)}
                      className="bg-white/10 px-2 py-1 rounded text-white w-full outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block">Base Wake</span>
                    <input
                      type="time"
                      value={baseWakeInput}
                      onChange={(e) => setBaseWakeInput(e.target.value)}
                      className="bg-white/10 px-2 py-1 rounded text-white w-full outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block">Target Sleep</span>
                    <input
                      type="time"
                      value={targetSleepInput}
                      onChange={(e) => setTargetSleepInput(e.target.value)}
                      className="bg-white/10 px-2 py-1 rounded text-white w-full outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block">Target Wake</span>
                    <input
                      type="time"
                      value={targetWakeInput}
                      onChange={(e) => setTargetWakeInput(e.target.value)}
                      className="bg-white/10 px-2 py-1 rounded text-white w-full outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/60">Shift/Day:</span>
                    <input
                      type="number"
                      value={shiftStepInput}
                      onChange={(e) => setShiftStepInput(Number(e.target.value))}
                      className="w-14 bg-white/10 px-2 py-0.5 rounded text-xs font-mono text-white outline-none"
                    />
                    <span className="text-[10px] font-mono text-white/40">mins</span>
                  </div>

                  <button
                    onClick={handleSaveSleepConfig}
                    className="px-3 py-1 bg-[#D71921] rounded-full text-xs font-medium text-white shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 text-[10px] font-mono text-white/40 border-t border-white/10 mt-3 flex justify-between">
            <span>Circadian Reset Goal</span>
            <span>8h Rest Window</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 4: 7-DAY WEEKLY SLEEP SCHEDULE GRAPH (CENTERPIECE) */}
      {/* ============================================================== */}
      <div className="col-span-12 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold block">
              WEEKLY SLEEP SCHEDULE GRAPH (7-DAY TIMELINE)
            </span>
            <span className="text-xs text-white/60 mt-0.5 block">
              Visualizing bedtime &amp; wake-up times shifting from 2:00 PM down toward 8:00 AM target.
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-white/90">
              <Sun size={12} className="text-amber-400" /> WAKE-UP LOG
            </span>
            <span className="flex items-center gap-1.5 text-[#D71921]">
              <span className="w-2 h-2 rounded-full bg-[#D71921]" /> TARGET ZONE (12 AM - 8 AM)
            </span>
          </div>
        </div>

        {/* 7-Day Floating Timeline Chart */}
        <div className="space-y-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          {weeklySleepData.map((item) => (
            <div
              key={item.dateKey}
              onClick={() => onSelectDateKey?.(item.dateKey)}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
            >
              {/* Day Label */}
              <span className="font-mono text-xs text-white/70 w-16 shrink-0 group-hover:text-white">
                {item.dayLabel}
              </span>

              {/* Horizontal Timeline Bar */}
              <div className="flex-1 mx-3 h-5 bg-white/[0.05] rounded-lg relative overflow-hidden flex items-center">
                {/* 12 AM to 8 AM Target Zone highlight (assumes 00:00 to 08:00 is first 33% of a 24h timeline) */}
                <div
                  className="absolute top-0 bottom-0 left-[20%] w-[33%] bg-[#D71921]/15 border-x border-[#D71921]/30"
                  title="Target Sleep Zone: 12:00 AM -> 08:00 AM"
                />

                {/* Actual Sleep Window Pill */}
                {item.durationMin > 0 ? (
                  <div
                    className="h-3.5 bg-white/20 group-hover:bg-[#D71921] rounded-md transition-colors flex items-center px-2 text-[9px] font-mono text-white/90"
                    style={{
                      width: `${Math.min(100, Math.max(25, (item.durationMin / (14 * 60)) * 100))}%`,
                      marginLeft: '15%',
                    }}
                  >
                    <span className="truncate">{item.sleep12} → {item.wake12}</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-mono text-white/20 pl-2">No sleep log</span>
                )}
              </div>

              {/* Wake-Up Time Display */}
              <div className="w-24 text-right font-mono text-xs font-medium shrink-0">
                <span className={item.durationMin > 0 ? 'text-amber-300' : 'text-white/30'}>
                  {item.wake12}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* WIDGET 5: DAILY FOCUS VS. DISTRACTED HOURS (14-DAY BARS) */}
      {/* ============================================================== */}
      <div className="col-span-12 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-6 text-[#F2F2F4]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold">
            DAILY FOCUS VS. DISTRACTED HOURS
          </span>

          <div className="flex items-center gap-3 text-[10px] font-mono">
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
                  {/* Distracted Segment */}
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
                  className={`mt-1.5 font-mono text-[9px] ${
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
          <div className="mt-3 text-right text-xs font-mono text-white/70">
            {activeHoverData.dateKey}: <span className="text-[#D71921] font-bold">{activeHoverData.focusedHours.toFixed(1)}H FOCUSED</span> · <span className="text-white/40">{activeHoverData.distractedHours.toFixed(1)}H DRIFT</span>
          </div>
        )}
      </div>
    </div>
  );
};
