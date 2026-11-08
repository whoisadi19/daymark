import React, { useState } from 'react';
import { db, DayRecord, getLocalDateKey, formatSleepDuration } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart2, Moon, CheckCircle2 } from 'lucide-react';

interface AnalyticsSectionProps {
  selectedDateKey: string;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ selectedDateKey }) => {
  const [hoveredBarcodeDay, setHoveredBarcodeDay] = useState<string | null>(null);

  // Generate 14 past date keys ending at today (or selected date)
  const todayKey = getLocalDateKey();
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

  // --- 1. Checkbox Completion Rate Calculations ---
  // Today's completion
  const todayTasks = allTasks?.filter((t) => t.dateKey === selectedDateKey && t.listType === 'today') || [];
  const todayTotal = todayTasks.length;
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  // 7-Day Rolling completion
  const past7Keys = past14DateKeys.slice(7); // Last 7 days
  const past7Tasks = allTasks?.filter((t) => past7Keys.includes(t.dateKey) && t.listType === 'today') || [];
  const past7Total = past7Tasks.length;
  const past7Completed = past7Tasks.filter((t) => t.completed).length;
  const past7Rate = past7Total > 0 ? Math.round((past7Completed / past7Total) * 100) : 0;

  // Segmented Meter helper (20 segments)
  const renderSegmentedMeter = (percent: number, activeColor: string) => {
    const activeSegments = Math.round((percent / 100) * 20);
    return (
      <div className="grid grid-cols-20 gap-0.5 p-1 bg-canvas border border-grid-line">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 transition-colors"
            style={{
              backgroundColor: i < activeSegments ? activeColor : 'var(--bg-panel)',
              border: `1px solid ${i < activeSegments ? activeColor : 'var(--border-grid)'}`,
            }}
          />
        ))}
      </div>
    );
  };

  // --- 2. 14-Day Desk Telemetry Stacked Barcode Data ---
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

  // Calculate max scale for chart (at least 8 hours)
  const maxSessionHours = Math.max(8, ...barcodeData.map((d) => d.totalHours));
  const chartHeight = 160;
  const chartWidth = 580;
  const colWidth = 28;
  const colGap = 12;
  const chartPaddingLeft = 35;
  const chartPaddingBottom = 25;

  // Active hover info
  const activeHoverData = barcodeData.find((d) => d.dateKey === hoveredBarcodeDay) || barcodeData[barcodeData.length - 1];

  // --- 3. Sleep vs. Distraction Correlation Table/Scatter Data ---
  // For each of the last 7 days, compare day's sleep duration to that day's (or next day's) distraction
  const correlationRows: Array<{
    dateKey: string;
    sleepHours: number;
    sleepMinStr: string;
    distractedHours: number;
    efficiency: number;
    focusedHours: number;
  }> = [];

  for (let i = 0; i < past7Keys.length; i++) {
    const dKey = past7Keys[i];
    const day = dayMap.get(dKey);
    if (day && day.sleepDurationMin > 0) {
      correlationRows.push({
        dateKey: dKey,
        sleepHours: Number((day.sleepDurationMin / 60).toFixed(1)),
        sleepMinStr: formatSleepDuration(day.sleepDurationMin),
        distractedHours: Number((day.distractedSeconds / 3600).toFixed(1)),
        efficiency:
          day.focusedSeconds + day.distractedSeconds > 0
            ? Math.round((day.focusedSeconds / (day.focusedSeconds + day.distractedSeconds)) * 100)
            : 0,
        focusedHours: Number((day.focusedSeconds / 3600).toFixed(1)),
      });
    }
  }

  // Correlation analysis deduction
  let correlationInsight = 'Telemetry calibrating: log at least 3 days of sleep and desk hours.';
  if (correlationRows.length >= 3) {
    const lowSleepHours = correlationRows.filter((r) => r.sleepHours < 7);
    const goodSleepHours = correlationRows.filter((r) => r.sleepHours >= 7);

    const avgDistractLow =
      lowSleepHours.length > 0
        ? lowSleepHours.reduce((acc, r) => acc + r.distractedHours, 0) / lowSleepHours.length
        : 0;
    const avgDistractGood =
      goodSleepHours.length > 0
        ? goodSleepHours.reduce((acc, r) => acc + r.distractedHours, 0) / goodSleepHours.length
        : 0;

    if (lowSleepHours.length > 0 && goodSleepHours.length > 0) {
      const delta = (avgDistractLow - avgDistractGood).toFixed(1);
      if (Number(delta) > 0) {
        correlationInsight = `OBSERVED PATTERN: Nights with <7.0h sleep correlate with +${delta}h higher desk distraction.`;
      } else {
        correlationInsight = `OBSERVED PATTERN: Distraction remains stable across sleep variations.`;
      }
    } else {
      correlationInsight = `DIAGNOSTIC SAMPLE: ${correlationRows.length} days logged. Sleep average: ${(
        correlationRows.reduce((a, b) => a + b.sleepHours, 0) / correlationRows.length
      ).toFixed(1)}h.`;
    }
  }

  return (
    <section className="bg-canvas border-plate text-text-ink relative flex flex-col">
      {/* Monospace Stamped Plate Header */}
      <div className="flex flex-wrap items-center justify-between border-plate-b bg-panel px-4 py-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-forest-olive inline-block"></span>
          <span className="font-mono text-xs font-bold tracking-widest uppercase">
            SEC.03 // ANALYTICS &amp; DIAGNOSTIC INSTRUMENTS
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-dim">
          PURE SVG ENGINE // ZERO EXTERNAL RUNTIME
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-grid-line">
        {/* ============================================================== */}
        {/* COLUMN 1: CHECKBOX COMPLETION RATE (METER GAUGES) */}
        {/* ============================================================== */}
        <div className="xl:col-span-4 p-4 flex flex-col justify-between bg-panel/20 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={15} className="text-forest-olive" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                INSTRUMENT 01 // EXECUTION
              </span>
            </div>
            <h3 className="font-serif text-lg font-bold text-text-primary">
              Checkbox Completion Rate
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              Daily and 7-day rolling execution delivery efficiency.
            </p>
          </div>

          {/* Today's Physical Meter */}
          <div className="bg-canvas border-plate p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-text-primary uppercase">
                TODAY'S COMPLETION
              </span>
              <span className="font-mono text-sm font-bold text-forest-olive tabular-nums">
                {todayCompleted}/{todayTotal} ({todayRate}%)
              </span>
            </div>
            {renderSegmentedMeter(todayRate, 'var(--accent-olive)')}
            <div className="flex justify-between text-[9px] font-mono text-text-dim">
              <span>0% PLANNED</span>
              <span>50%</span>
              <span>100% COMPLETE</span>
            </div>
          </div>

          {/* 7-Day Rolling Meter */}
          <div className="bg-canvas border-plate p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-text-primary uppercase">
                7-DAY ROLLING COMPLETION
              </span>
              <span className="font-mono text-sm font-bold text-text-primary tabular-nums">
                {past7Completed}/{past7Total} ({past7Rate}%)
              </span>
            </div>
            {renderSegmentedMeter(past7Rate, 'var(--accent-orange)')}
            <div className="flex justify-between text-[9px] font-mono text-text-dim">
              <span>0% PLANNED</span>
              <span>50%</span>
              <span>100% COMPLETE</span>
            </div>
          </div>

          {/* Stamped Execution Quality Readout */}
          <div className="p-3 bg-canvas border border-dashed border-grid-line font-mono text-[10px] text-text-dim space-y-1">
            <div className="text-text-primary font-bold uppercase tracking-wider">
              DELIVERY DIAGNOSTIC:
            </div>
            <p>
              {past7Rate >= 80
                ? 'High execution discipline: plan queues maintain low rollover frequency.'
                : past7Rate >= 50
                ? 'Moderate execution pace: prune trivial queue entries to avoid stale debt.'
                : 'Plan bottleneck detected: reduce tomorrow queue slots to under 3 items.'}
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: 14-DAY DESK TELEMETRY STACKED BARCODE CHART */}
        {/* ============================================================== */}
        <div className="xl:col-span-8 p-4 flex flex-col justify-between bg-canvas space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-braun-orange" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  INSTRUMENT 02 // 14-DAY BARCODE
                </span>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span className="flex items-center gap-1.5 text-braun-orange font-medium">
                  <span className="w-2.5 h-2.5 bg-braun-orange inline-block"></span>
                  FOCUSED HOURS
                </span>
                <span className="flex items-center gap-1.5 text-ochre-amber font-medium">
                  <span className="w-2.5 h-2.5 bg-ochre-amber inline-block"></span>
                  DISTRACTED HOURS
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-bold text-text-primary">
                14-Day Desk Telemetry Stacked Barcode
              </h3>

              {/* Active Inspector Readout Badge */}
              {activeHoverData && (
                <div className="font-mono text-[10px] bg-panel border border-grid-line px-2.5 py-1 text-text-ink flex items-center gap-2">
                  <span className="font-bold text-braun-orange">{activeHoverData.dateKey}:</span>
                  <span>TOTAL: {activeHoverData.totalHours.toFixed(1)}h</span>
                  <span className="text-braun-orange font-bold">FOC: {activeHoverData.focusedHours.toFixed(1)}h</span>
                  <span className="text-ochre-amber font-bold">DIS: {activeHoverData.distractedHours.toFixed(1)}h</span>
                  <span className="bg-canvas border border-grid-line px-1 font-bold">
                    EFF: {activeHoverData.efficiency}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pure Inline SVG Barcode Stacked Chart */}
          <div className="w-full overflow-x-auto bg-panel/30 border border-grid-line p-3">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + chartPaddingBottom}`}
              className="w-full h-auto min-w-[500px]"
            >
              {/* Horizontal Reference Lines & Labels (0h, 2h, 4h, 6h, 8h) */}
              {[0, 2, 4, 6, 8].map((hVal) => {
                const yPos = chartHeight - (hVal / maxSessionHours) * chartHeight;
                return (
                  <g key={hVal}>
                    <line
                      x1={chartPaddingLeft}
                      y1={yPos}
                      x2={chartWidth - 10}
                      y2={yPos}
                      stroke="var(--border-grid)"
                      strokeWidth="1"
                      strokeDasharray={hVal === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={chartPaddingLeft - 6}
                      y={yPos + 3}
                      fill="var(--text-muted)"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                    >
                      {hVal}h
                    </text>
                  </g>
                );
              })}

              {/* 14 Stacked Columns */}
              {barcodeData.map((d, idx) => {
                const xPos = chartPaddingLeft + 8 + idx * (colWidth + colGap);
                const focusedH = (d.focusedHours / maxSessionHours) * chartHeight;
                const distractedH = (d.distractedHours / maxSessionHours) * chartHeight;
                const totalH = focusedH + distractedH;

                const focusedY = chartHeight - focusedH;
                const distractedY = focusedY - distractedH;
                const isHovered = hoveredBarcodeDay === d.dateKey;
                const isToday = d.dateKey === todayKey;

                return (
                  <g
                    key={d.dateKey}
                    onMouseEnter={() => setHoveredBarcodeDay(d.dateKey)}
                    onMouseLeave={() => setHoveredBarcodeDay(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover highlight background */}
                    {isHovered && (
                      <rect
                        x={xPos - 4}
                        y={0}
                        width={colWidth + 8}
                        height={chartHeight}
                        fill="rgba(20, 20, 19, 0.04)"
                      />
                    )}

                    {/* Empty Day Outline placeholder */}
                    {totalH === 0 && (
                      <rect
                        x={xPos}
                        y={chartHeight - 4}
                        width={colWidth}
                        height={4}
                        fill="var(--border-grid)"
                      />
                    )}

                    {/* Stack 1: Focused Hours (Braun Orange) */}
                    {focusedH > 0 && (
                      <rect
                        x={xPos}
                        y={focusedY}
                        width={colWidth}
                        height={focusedH}
                        fill="var(--accent-orange)"
                        stroke="#B02B16"
                        strokeWidth="1"
                      />
                    )}

                    {/* Stack 2: Distracted Hours (Ochre Amber) */}
                    {distractedH > 0 && (
                      <rect
                        x={xPos}
                        y={distractedY}
                        width={colWidth}
                        height={distractedH}
                        fill="var(--accent-amber)"
                        stroke="#A3630A"
                        strokeWidth="1"
                      />
                    )}

                    {/* Date label at bottom */}
                    <text
                      x={xPos + colWidth / 2}
                      y={chartHeight + 15}
                      fill={isToday ? 'var(--accent-orange)' : 'var(--text-muted)'}
                      fontSize="9"
                      fontWeight={isToday ? '700' : '500'}
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {d.dayNumber}
                    </text>

                    {/* Efficiency % pip on top if active */}
                    {d.totalHours > 0 && (
                      <text
                        x={xPos + colWidth / 2}
                        y={distractedY - 4}
                        fill="var(--text-primary)"
                        fontSize="8"
                        fontFamily="JetBrains Mono"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {d.efficiency}%
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 3-C: SLEEP VS. DISTRACTION CORRELATION TABLE & SCATTER */}
      {/* ============================================================== */}
      <div className="border-plate-t p-4 bg-canvas/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Moon size={15} className="text-forest-olive" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
              INSTRUMENT 03 // SLEEP &amp; COGNITIVE CORRELATION
            </span>
            <h4 className="font-serif text-lg font-bold text-text-primary ml-1">
              Sleep vs. Distraction Analysis (Past 7 Days)
            </h4>
          </div>

          <div className="font-mono text-[10px] bg-panel border border-grid-line px-3 py-1 font-semibold text-text-primary">
            {correlationInsight}
          </div>
        </div>

        {/* Data Matrix & Inline Correlation Scatter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Table View */}
          <div className="lg:col-span-8 overflow-x-auto border border-grid-line">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-panel border-plate-b text-[10px] text-text-dim uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Date Key</th>
                  <th className="py-2 px-3">Sleep Logged</th>
                  <th className="py-2 px-3">Sleep (H)</th>
                  <th className="py-2 px-3 text-braun-orange">Focused (H)</th>
                  <th className="py-2 px-3 text-ochre-amber">Distracted (H)</th>
                  <th className="py-2 px-3">Desk Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grid-line bg-canvas">
                {correlationRows.length > 0 ? (
                  correlationRows.map((row) => (
                    <tr key={row.dateKey} className="hover:bg-panel/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-text-primary">{row.dateKey}</td>
                      <td className="py-2 px-3">{row.sleepMinStr}</td>
                      <td className="py-2 px-3 font-bold">{row.sleepHours}h</td>
                      <td className="py-2 px-3 text-braun-orange font-semibold">{row.focusedHours}h</td>
                      <td className="py-2 px-3 text-ochre-amber font-semibold">{row.distractedHours}h</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 border font-bold ${
                            row.efficiency >= 80
                              ? 'bg-forest-olive/10 text-forest-olive border-forest-olive/30'
                              : row.efficiency >= 50
                              ? 'bg-braun-orange/10 text-braun-orange border-braun-orange/30'
                              : 'bg-ochre-amber/10 text-ochre-amber border-ochre-amber/30'
                          }`}
                        >
                          {row.efficiency}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-text-dim">
                      No sleep data recorded in the past 7 days. Log sleep in the top specification bar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Crisp Pure SVG Scatter Matrix Plot */}
          <div className="lg:col-span-4 bg-panel border border-grid-line p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-dim">
                  SCATTER: SLEEP vs DISTRACTION
                </span>
                <span className="font-mono text-[9px] text-text-dim">X: SLEEP | Y: DISTRACT</span>
              </div>

              {/* Inline SVG Scatter Plot */}
              <svg viewBox="0 0 200 130" className="w-full h-auto bg-canvas border border-grid-line p-1">
                {/* Horizontal reference grid lines */}
                <line x1="20" y1="20" x2="190" y2="20" stroke="var(--border-grid)" strokeDasharray="2 2" />
                <line x1="20" y1="60" x2="190" y2="60" stroke="var(--border-grid)" strokeDasharray="2 2" />
                <line x1="20" y1="100" x2="190" y2="100" stroke="var(--border-grid)" />

                {/* Y Axis Labels */}
                <text x="16" y="24" fontSize="7" fill="var(--text-muted)" textAnchor="end" fontFamily="JetBrains Mono">
                  4h
                </text>
                <text x="16" y="64" fontSize="7" fill="var(--text-muted)" textAnchor="end" fontFamily="JetBrains Mono">
                  2h
                </text>
                <text x="16" y="103" fontSize="7" fill="var(--text-muted)" textAnchor="end" fontFamily="JetBrains Mono">
                  0h
                </text>

                {/* X Axis Labels (4h to 10h) */}
                <text x="25" y="115" fontSize="7" fill="var(--text-muted)" fontFamily="JetBrains Mono">
                  4h
                </text>
                <text x="100" y="115" fontSize="7" fill="var(--text-muted)" textAnchor="middle" fontFamily="JetBrains Mono">
                  7h
                </text>
                <text x="185" y="115" fontSize="7" fill="var(--text-muted)" textAnchor="end" fontFamily="JetBrains Mono">
                  10h
                </text>

                {/* Plot Points */}
                {correlationRows.map((r, i) => {
                  // X: Sleep (4h -> 10h) => x range 25 to 185
                  const clampedSleep = Math.min(10, Math.max(4, r.sleepHours));
                  const cx = 25 + ((clampedSleep - 4) / 6) * 160;

                  // Y: Distracted (0h -> 4h) => y range 100 to 20
                  const clampedDistract = Math.min(4, Math.max(0, r.distractedHours));
                  const cy = 100 - (clampedDistract / 4) * 80;

                  return (
                    <g key={i}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill="var(--accent-amber)"
                        stroke="var(--bg-ink)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx}
                        y={cy - 6}
                        fontSize="6"
                        fill="var(--text-primary)"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        {r.dateKey.split('-')[2]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <p className="font-mono text-[9px] text-text-dim mt-2">
              Amber markers indicate day-by-day telemetry points. Notice clusters in upper-left under short sleep conditions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
