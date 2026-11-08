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
import { Moon, Check, X } from 'lucide-react';

interface AnalyticsSectionProps {
  selectedDateKey: string;
  onSelectDateKey?: (dateKey: string) => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  selectedDateKey,
  onSelectDateKey,
}) => {
  const [chartTab, setChartTab] = useState<'sleep' | 'focus'>('sleep');
  const [hoveredBarcodeDay, setHoveredBarcodeDay] = useState<string | null>(null);

  // Sleep Schedule Config
  const [sleepConfig, setSleepConfig] = useState<SleepScheduleConfig>(() => getSleepScheduleConfig());
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Form states for config editing modal
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

  // Local draft states for sleep editing (defaults to 04:30 and 12:30 if unlogged)
  const [draftSleepTime, setDraftSleepTime] = useState<string>('04:30');
  const [draftWakeTime, setDraftWakeTime] = useState<string>('12:30');
  const [justLogged, setJustLogged] = useState<boolean>(false);

  useEffect(() => {
    if (
      currentDayRecord?.sleepTime &&
      currentDayRecord?.wakeTime &&
      (currentDayRecord?.sleepDurationMin || 0) > 0
    ) {
      setDraftSleepTime(currentDayRecord.sleepTime);
      setDraftWakeTime(currentDayRecord.wakeTime);
    } else {
      setDraftSleepTime('04:30');
      setDraftWakeTime('12:30');
    }
    setJustLogged(false);
  }, [currentDayRecord, selectedDateKey]);

  // Is today's record saved in DB?
  const isLogged = Boolean(
    currentDayRecord?.sleepTime &&
    currentDayRecord?.wakeTime &&
    (currentDayRecord?.sleepDurationMin || 0) > 0
  );

  const isMatchingSaved =
    isLogged &&
    currentDayRecord?.sleepTime === draftSleepTime &&
    currentDayRecord?.wakeTime === draftWakeTime;

  const draftDurationMin = calculateSleepMinutes(draftSleepTime, draftWakeTime);

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

  // 14-Day Focus Data
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
  const handleLogSleep = async () => {
    if (!draftSleepTime || !draftWakeTime) return;
    const duration = calculateSleepMinutes(draftSleepTime, draftWakeTime);
    const existing = await db.days.get(selectedDateKey);
    await db.days.put({
      dateKey: selectedDateKey,
      sleepTime: draftSleepTime,
      wakeTime: draftWakeTime,
      sleepDurationMin: duration,
      focusedSeconds: existing?.focusedSeconds || 0,
      distractedSeconds: existing?.distractedSeconds || 0,
      updatedAt: Date.now(),
    });
    setJustLogged(true);
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

  // Shift Calculations for tonight
  const shiftStats = calculateSleepShiftForDate(sleepConfig, selectedDateKey);

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
    <div className="w-full grid grid-cols-12 gap-4 animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* CARD 1: UNIFIED SLEEP LOG & SHIFTER (col-span-12 md:col-span-7) */}
      {/* ============================================================== */}
      <div className="col-span-12 md:col-span-7 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4] flex flex-col justify-between">
        {/* Header: SLEEP on left, total duration badge on right */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold flex items-center gap-1.5">
            <Moon size={12} className="text-[#D71921]" />
            SLEEP
          </span>
          <span
            className={`font-mono text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
              isLogged
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/10 text-white/50'
            }`}
          >
            {isLogged ? formatSleepDuration(currentDayRecord!.sleepDurationMin) : '--h --m'}
          </span>
        </div>

        {/* Middle Row: 2 Compact Time Inputs side-by-side */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          <div className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                Slept at
              </span>
              <span className="text-[10px] font-mono text-white/70">
                {formatTime12Hour(draftSleepTime)}
              </span>
            </div>
            <input
              type="time"
              value={draftSleepTime}
              onChange={(e) => {
                setDraftSleepTime(e.target.value);
                setJustLogged(false);
              }}
              className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-1 font-mono text-sm text-white font-medium outline-none w-full cursor-pointer focus:border-[#D71921]/60 focus:bg-black/50 transition-all"
            />
          </div>

          <div className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                Woke at
              </span>
              <span className="text-[10px] font-mono text-white/70">
                {formatTime12Hour(draftWakeTime)}
              </span>
            </div>
            <input
              type="time"
              value={draftWakeTime}
              onChange={(e) => {
                setDraftWakeTime(e.target.value);
                setJustLogged(false);
              }}
              className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-1 font-mono text-sm text-white font-medium outline-none w-full cursor-pointer focus:border-[#D71921]/60 focus:bg-black/50 transition-all"
            />
          </div>
        </div>

        {/* Tactile Nothing OS "Log Sleep" Button */}
        <button
          onClick={handleLogSleep}
          className={`w-full py-2.5 px-4 rounded-2xl font-mono text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer ${
            isMatchingSaved || justLogged
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-[#ECECEF] hover:bg-white text-[#0A0A0C] shadow-lg hover:shadow-white/20'
          }`}
        >
          {isMatchingSaved || justLogged ? (
            <>
              <Check size={14} className="text-emerald-400 stroke-[2.5]" />
              <span>
                Sleep Logged · {formatSleepDuration(currentDayRecord?.sleepDurationMin || draftDurationMin)} (Update)
              </span>
            </>
          ) : (
            <>
              <Moon size={13} className="text-[#D71921]" />
              <span>Log Sleep · {formatSleepDuration(draftDurationMin)}</span>
            </>
          )}
        </button>

        {/* Bottom Divider: Tonight's Shift on Left, Final Goal on Right */}
        <div className="border-t border-white/10 pt-3 mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: Tonight's Shift */}
          <div className="flex items-center gap-1.5 font-mono text-white/80">
            <span className="text-white/40 text-[11px]">Target:</span>
            <span className="font-medium text-white">{formatTime12Hour(shiftStats.tonightSleepTime)}</span>
            <span className="text-white/40">→</span>
            <span className="font-medium text-white">{formatTime12Hour(shiftStats.tonightWakeTime)}</span>
            <span className="text-[10px] bg-[#D71921] text-white px-1.5 py-0.2 rounded-full font-bold ml-1">
              -{sleepConfig.shiftMinutesPerDay}m/d
            </span>
          </div>

          {/* Right: Final Goal */}
          <button
            onClick={() => setIsEditingConfig(true)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer text-left"
            title="Click to edit target sleep schedule"
          >
            <span>Goal: {formatTime12Hour(sleepConfig.targetSleepTime)} → {formatTime12Hour(sleepConfig.targetWakeTime)}</span>
            <span className="text-white/40">
              ({shiftStats.isTargetReached ? 'reached' : `${shiftStats.daysRemaining}d left`})
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CARD 2: TASK COMPLETION (col-span-12 md:col-span-5) */}
      {/* ============================================================== */}
      <div className="col-span-12 md:col-span-5 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4] flex flex-col justify-between">
        {/* Header: TASK COMPLETION on left, 7d avg in muted mono on right */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold">
            TASK COMPLETION
          </span>
          <span className="text-[10px] font-mono uppercase text-white/40">
            7d avg: {past7Rate}%
          </span>
        </div>

        {/* Center: Big clean percentage & subtitle */}
        <div className="my-2">
          <div className="font-mono text-5xl font-light tracking-tight text-white tabular-nums">
            {todayRate}%
          </div>
          <span className="text-xs text-white/50 font-mono mt-0.5 block">
            {todayCompleted}/{todayTotal} tasks done today
          </span>
        </div>

        {/* Bottom: Single crisp ASCII progress bar. Displays percentage exactly once! */}
        <div className="font-mono text-xs text-white/70 tracking-wider">
          {renderAsciiProgressBar(todayRate, 14)}
        </div>
      </div>

      {/* ============================================================== */}
      {/* CARD 3: SINGLE TABBED CHART CARD (col-span-12) */}
      {/* ============================================================== */}
      <div className="col-span-12 bg-[#161618]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[28px] p-5 text-[#F2F2F4]">
        {/* Card Header: Left Segmented Pill Toggle | Right 2-Dot Legend */}
        <div className="flex items-center justify-between mb-3">
          {/* Segmented Pill Toggle */}
          <div className="bg-white/[0.06] p-1 rounded-full flex items-center gap-1 border border-white/10">
            <button
              onClick={() => setChartTab('sleep')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                chartTab === 'sleep'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              7-Day Sleep
            </button>
            <button
              onClick={() => setChartTab('focus')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                chartTab === 'focus'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              14-Day Focus
            </button>
          </div>

          {/* Right: Simple 2-Dot Legend */}
          <div className="flex items-center gap-3 text-[10px] font-mono">
            {chartTab === 'sleep' ? (
              <>
                <span className="flex items-center gap-1.5 text-white/90">
                  <span className="w-2 h-2 rounded-full bg-white/70" /> Logged
                </span>
                <span className="flex items-center gap-1.5 text-[#D71921]">
                  <span className="w-2 h-2 rounded-full bg-[#D71921]" /> 12a–8a Goal
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-white/90">
                  <span className="w-2 h-2 rounded-full bg-[#D71921]" /> Focused
                </span>
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="w-2 h-2 rounded-full bg-white/30" /> Distracted
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Compact 7-Row Horizontal Sleep Chart (h-44) */}
        {chartTab === 'sleep' && (
          <div className="h-44 flex flex-col justify-between py-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-3">
            {weeklySleepData.map((item) => (
              <div
                key={item.dateKey}
                onClick={() => onSelectDateKey?.(item.dateKey)}
                className="flex items-center justify-between text-xs py-0.5 px-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                {/* Day Label */}
                <span className="font-mono text-[11px] text-white/60 w-14 shrink-0 group-hover:text-white">
                  {item.dayLabel}
                </span>

                {/* Horizontal Bar Track */}
                <div className="flex-1 mx-2.5 h-4 bg-white/[0.05] rounded relative overflow-hidden flex items-center">
                  {/* 12 AM to 8 AM Target Zone highlight */}
                  <div
                    className="absolute top-0 bottom-0 left-[20%] w-[33%] bg-[#D71921]/15 border-x border-[#D71921]/30"
                    title="Target Sleep Zone: 12:00 AM -> 08:00 AM"
                  />

                  {/* Logged Sleep Window */}
                  {item.durationMin > 0 ? (
                    <div
                      className="h-3 bg-white/20 group-hover:bg-[#D71921] rounded transition-colors flex items-center px-1.5 text-[9px] font-mono text-white/90"
                      style={{
                        width: `${Math.min(100, Math.max(25, (item.durationMin / (14 * 60)) * 100))}%`,
                        marginLeft: '15%',
                      }}
                    >
                      <span className="truncate">{item.sleep12} → {item.wake12}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono text-white/20 pl-1.5">No sleep log</span>
                  )}
                </div>

                {/* Wake-Up Time Display */}
                <span className={`w-16 text-right font-mono text-[11px] shrink-0 ${
                  item.durationMin > 0 ? 'text-amber-300' : 'text-white/30'
                }`}>
                  {item.wake12}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: 14-Day Vertical Bar Chart (h-44) */}
        {chartTab === 'focus' && (
          <div className="h-44 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3 flex flex-col justify-end">
            <div className="flex items-end justify-between gap-1.5 h-32">
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
                    <div
                      className={`w-full h-full rounded-full relative overflow-hidden flex flex-col justify-end transition-all ${
                        isSelected
                          ? 'ring-1 ring-white bg-white/20'
                          : 'bg-white/[0.06] group-hover:bg-white/[0.12]'
                      }`}
                    >
                      {distractedPct > 0 && (
                        <div
                          className="w-full bg-white/25 rounded-t-full"
                          style={{ height: `${distractedPct}%` }}
                        />
                      )}
                      {focusedPct > 0 && (
                        <div
                          className={`w-full bg-[#D71921] ${distractedPct === 0 ? 'rounded-t-full' : ''}`}
                          style={{ height: `${focusedPct}%` }}
                        />
                      )}
                    </div>

                    <span
                      className={`mt-1 font-mono text-[9px] ${
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
              <div className="mt-1 text-right text-[11px] font-mono text-white/70">
                {activeHoverData.dateKey}: <span className="text-[#D71921] font-bold">{activeHoverData.focusedHours.toFixed(1)}H FOCUSED</span> · <span className="text-white/40">{activeHoverData.distractedHours.toFixed(1)}H DRIFT</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TARGET SCHEDULE EDITOR MODAL */}
      {/* ============================================================== */}
      {isEditingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#161618]/95 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9)] rounded-[32px] p-6 text-white relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-semibold text-sm text-white">Edit Sleep Schedule Target</h3>
              <button
                onClick={() => setIsEditingConfig(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Base Sleep</span>
                  <input
                    type="time"
                    value={baseSleepInput}
                    onChange={(e) => setBaseSleepInput(e.target.value)}
                    className="bg-white/10 px-2.5 py-1.5 rounded-xl text-white w-full outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Base Wake</span>
                  <input
                    type="time"
                    value={baseWakeInput}
                    onChange={(e) => setBaseWakeInput(e.target.value)}
                    className="bg-white/10 px-2.5 py-1.5 rounded-xl text-white w-full outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Target Sleep</span>
                  <input
                    type="time"
                    value={targetSleepInput}
                    onChange={(e) => setTargetSleepInput(e.target.value)}
                    className="bg-white/10 px-2.5 py-1.5 rounded-xl text-white w-full outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Target Wake</span>
                  <input
                    type="time"
                    value={targetWakeInput}
                    onChange={(e) => setTargetWakeInput(e.target.value)}
                    className="bg-white/10 px-2.5 py-1.5 rounded-xl text-white w-full outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-white/60">Shift/Day:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={shiftStepInput}
                    onChange={(e) => setShiftStepInput(Number(e.target.value))}
                    className="w-16 bg-white/10 px-2.5 py-1 rounded-xl text-xs font-mono text-white outline-none"
                  />
                  <span className="text-white/40">mins</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsEditingConfig(false)}
                className="px-4 py-2 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSleepConfig}
                className="px-4 py-2 bg-[#D71921] hover:bg-[#b5141b] text-white rounded-full text-xs font-medium transition-all shadow-md cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
