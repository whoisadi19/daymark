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

  // 3. Sleep vs. Focus Efficiency (4-Row Mini Table)
  const recent4Keys = past7Keys.slice(-4);
  const recentSleepRows = recent4Keys.map((dKey) => {
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
    <section className="bg-[#FAF9F6] border border-[#DCD9D0] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-1 flex flex-col justify-between">
      {/* Top: 14-Day Focus vs. Drift inside Recessed Well */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#686660] font-medium">
            14-Day Focus vs. Drift
          </span>
          {activeHoverData ? (
            <span className="font-mono text-[11px] text-[#111110] font-medium">
              {activeHoverData.dateKey}: {activeHoverData.focusedHours.toFixed(1)}h focus · {activeHoverData.distractedHours.toFixed(1)}h drift
            </span>
          ) : (
            <div className="flex items-center gap-2.5 text-[10px] font-mono text-[#686660]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5391A]" /> Focus
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /> Drift
              </span>
            </div>
          )}
        </div>

        {/* Recessed Well with 14 Full-Height Architectural Vertical Tracks */}
        <div className="bg-[#F2F0EA] border border-[#E5E2D9] rounded-xl p-3.5 h-36 flex items-end justify-between gap-1.5">
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
                {/* Full-Height Vertical Architectural Track */}
                <div
                  className={`w-full h-full rounded-md relative overflow-hidden flex flex-col justify-end transition-all ${
                    isSelected
                      ? 'ring-1 ring-[#111110] bg-[#E2DFD4]'
                      : 'bg-[#E5E2D9] group-hover:bg-[#DDD9CE]'
                  }`}
                >
                  {/* Distracted Segment on Top */}
                  {distractedPct > 0 && (
                    <div
                      className="w-full bg-[#D97706] rounded-t-sm"
                      style={{ height: `${distractedPct}%` }}
                    />
                  )}
                  {/* Focused Segment on Bottom */}
                  {focusedPct > 0 && (
                    <div
                      className={`w-full bg-[#E5391A] ${distractedPct === 0 ? 'rounded-t-sm' : ''}`}
                      style={{ height: `${focusedPct}%` }}
                    />
                  )}
                </div>

                {/* Day Number */}
                <span
                  className={`mt-1 font-mono text-[9px] ${
                    isSelected ? 'text-[#111110] font-bold' : 'text-[#9E9B93] group-hover:text-[#111110]'
                  }`}
                >
                  {d.dayNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: 2-Column Mini Bento inside Card */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        {/* Left Well: Checkbox Rate */}
        <div className="bg-[#F2F0EA] border border-[#E5E2D9] rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#686660] font-medium block mb-1">
              Checkbox Rate
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold tracking-tight text-[#111110] tabular-nums">
                {todayRate}%
              </span>
              <span className="text-[11px] font-mono text-[#686660]">
                7d: {past7Rate}%
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-[#E5E2D9] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#111110] rounded-full transition-all duration-300"
              style={{ width: `${todayRate}%` }}
            />
          </div>
        </div>

        {/* Right Well: Sleep vs. Efficiency Mini Table */}
        <div className="bg-[#F2F0EA] border border-[#E5E2D9] rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#686660] font-medium block mb-1">
            Sleep vs Efficiency
          </span>

          <div className="space-y-1">
            {recentSleepRows.map((row) => (
              <div key={row.dateKey} className="flex items-center justify-between text-[11px] font-mono py-0.2">
                <span className="text-[#686660] w-6">{row.dayLabel}</span>
                <span className="text-[#111110] font-medium w-9 text-center">
                  {row.sleepHours !== null ? `${row.sleepHours}h` : '—'}
                </span>
                <div className="flex-1 mx-2 h-1 bg-[#E5E2D9] rounded-full overflow-hidden">
                  {row.efficiency !== null && (
                    <div
                      className={`h-full rounded-full ${
                        row.efficiency >= 75
                          ? 'bg-[#111110]'
                          : row.efficiency >= 50
                          ? 'bg-[#D97706]'
                          : 'bg-[#E5391A]'
                      }`}
                      style={{ width: `${row.efficiency}%` }}
                    />
                  )}
                </div>
                <span className="text-[#111110] font-medium w-7 text-right">
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
