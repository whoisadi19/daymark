import React, { useState } from 'react';
import { db, DayRecord, getLocalDateKey } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface AnalyticsSectionProps {
  selectedDateKey: string;
  onSelectDateKey?: (dateKey: string) => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  selectedDateKey,
  onSelectDateKey,
}) => {
  const [hoveredBarcodeDay, setHoveredBarcodeDay] = useState<string | null>(null);

  // Generate 14 past date keys ending at today
  const past14DateKeys: string[] = [];
  const baseDate = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    past14DateKeys.push(getLocalDateKey(d));
  }

  // Live queries
  const allDays = useLiveQuery(() => db.days.toArray(), []);
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);

  // Map for fast day lookup
  const dayMap = new Map<string, DayRecord>();
  allDays?.forEach((d) => dayMap.set(d.dateKey, d));

  // 1. Completion Rate Calculations
  const todayTasks = allTasks?.filter((t) => t.dateKey === selectedDateKey && t.listType === 'today') || [];
  const todayTotal = todayTasks.length;
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const past7Keys = past14DateKeys.slice(7);
  const past7Tasks = allTasks?.filter((t) => past7Keys.includes(t.dateKey) && t.listType === 'today') || [];
  const past7Total = past7Tasks.length;
  const past7Completed = past7Tasks.filter((t) => t.completed).length;
  const past7Rate = past7Total > 0 ? Math.round((past7Completed / past7Total) * 100) : 0;

  // 2. 14-Day Desk Telemetry Data
  const barcodeData = past14DateKeys.map((dateKey) => {
    const day = dayMap.get(dateKey);
    const focusedHours = day ? day.focusedSeconds / 3600 : 0;
    const distractedHours = day ? day.distractedSeconds / 3600 : 0;
    const totalHours = focusedHours + distractedHours;
    const efficiency = totalHours > 0 ? Math.round((focusedHours / totalHours) * 100) : 0;

    const [,, d] = dateKey.split('-');
    return {
      dateKey,
      dayNumber: d,
      focusedHours,
      distractedHours,
      totalHours,
      efficiency,
    };
  });

  const maxSessionHours = Math.max(8, ...barcodeData.map((d) => d.totalHours));
  const activeHoverData = barcodeData.find((d) => d.dateKey === hoveredBarcodeDay);

  // 3. Sleep vs. Focus Efficiency (Last 7 Days)
  const sleepCorrelationRows = past7Keys.map((dKey) => {
    const day = dayMap.get(dKey);
    const [y, m, d] = dKey.split('-').map(Number);
    const dayLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'narrow', day: 'numeric' });
    const sleepHours = day && day.sleepDurationMin > 0 ? Number((day.sleepDurationMin / 60).toFixed(1)) : null;
    const totalDesk = (day?.focusedSeconds || 0) + (day?.distractedSeconds || 0);
    const efficiency = totalDesk > 0 ? Math.round(((day?.focusedSeconds || 0) / totalDesk) * 100) : null;

    return {
      dateKey: dKey,
      dayLabel,
      sleepHours,
      efficiency,
    };
  });

  return (
    <section className="border-t border-[#E6E4DD] pt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* ============================================================== */}
        {/* BLOCK 1: COMPLETION RATE */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <span className="block text-[11px] font-medium tracking-wider text-muted uppercase">
            Task Completion
          </span>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-ink font-medium">Today</span>
              <span className="font-mono text-2xl font-light text-ink tabular-nums">
                {todayRate}%
              </span>
            </div>
            {/* Simple thin horizontal progress bar */}
            <div className="h-1.5 w-full bg-[#E6E4DD] rounded-full overflow-hidden">
              <div
                className="h-full bg-ink transition-all duration-300 rounded-full"
                style={{ width: `${todayRate}%` }}
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-muted">7-Day Average</span>
              <span className="font-mono text-sm text-muted tabular-nums">
                {past7Rate}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#E6E4DD] rounded-full overflow-hidden">
              <div
                className="h-full bg-muted transition-all duration-300 rounded-full"
                style={{ width: `${past7Rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BLOCK 2: 14-DAY FOCUS VS. DRIFT (MINIMAL STACKED BARS) */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="block text-[11px] font-medium tracking-wider text-muted uppercase">
              14-Day Focus vs. Drift
            </span>
            {activeHoverData && (
              <span className="font-mono text-[11px] text-ink">
                {activeHoverData.focusedHours.toFixed(1)}h / {activeHoverData.totalHours.toFixed(1)}h
              </span>
            )}
          </div>

          {/* Minimal Vertical Stacked Bar Chart */}
          <div className="h-24 flex items-end justify-between gap-1.5 pt-2">
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
                  {/* Bar stack: distracted on top, focused on bottom */}
                  <div className="w-1.5 sm:w-2 flex flex-col justify-end h-full">
                    {distractedPct > 0 && (
                      <div
                        className="w-full bg-[#D99B26] rounded-t-sm"
                        style={{ height: `${distractedPct}%` }}
                      />
                    )}
                    {focusedPct > 0 && (
                      <div
                        className={`w-full bg-[#E04F33] ${distractedPct === 0 ? 'rounded-t-sm' : ''} rounded-b-sm`}
                        style={{ height: `${focusedPct}%` }}
                      />
                    )}
                    {focusedPct === 0 && distractedPct === 0 && (
                      <div className="w-full h-1 bg-[#E6E4DD] rounded-full" />
                    )}
                  </div>

                  {/* Day label */}
                  <span
                    className={`mt-2 font-mono text-[9px] ${
                      isSelected ? 'text-ink font-bold' : 'text-muted/60 group-hover:text-ink'
                    }`}
                  >
                    {d.dayNumber}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E04F33]" /> Focus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D99B26]" /> Drift
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BLOCK 3: SLEEP VS. FOCUS EFFICIENCY (MINI-LIST) */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <span className="block text-[11px] font-medium tracking-wider text-muted uppercase">
            Sleep vs. Efficiency (7d)
          </span>

          <div className="space-y-1.5">
            {sleepCorrelationRows.map((row) => (
              <div
                key={row.dateKey}
                className="flex items-center justify-between text-xs py-0.5"
              >
                <span className="font-mono text-muted text-[11px] w-8">
                  {row.dayLabel}
                </span>

                <span className="font-mono text-ink text-[11px] w-12 text-center">
                  {row.sleepHours !== null ? `${row.sleepHours}h` : '—'}
                </span>

                <div className="flex-1 mx-3 h-1 bg-[#E6E4DD] rounded-full overflow-hidden">
                  {row.efficiency !== null && (
                    <div
                      className={`h-full rounded-full ${
                        row.efficiency >= 75 ? 'bg-ink' : row.efficiency >= 50 ? 'bg-[#D99B26]' : 'bg-[#E04F33]'
                      }`}
                      style={{ width: `${row.efficiency}%` }}
                    />
                  )}
                </div>

                <span className="font-mono text-[11px] text-ink w-8 text-right">
                  {row.efficiency !== null ? `${row.efficiency}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
