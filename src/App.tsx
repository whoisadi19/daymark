import React, { useState, useEffect } from 'react';
import { getLocalDateKey, ensureDefaultGoals } from './db/db';
import { TopSpecificationBar } from './components/TopSpecificationBar';
import { DailyLogSection } from './components/DailyLogSection';
import { DeskTrackerSection } from './components/DeskTrackerSection';
import { AnalyticsSection } from './components/AnalyticsSection';
import { HardDrive, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey());
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState<number>(0);

  // Ensure default goals are seeded on initial load
  useEffect(() => {
    ensureDefaultGoals();
  }, []);

  const handleDataResetOrSeed = () => {
    setDataRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-ink dot-grid-pattern flex flex-col font-sans selection:bg-braun-orange selection:text-white">
      {/* 1. Persistent Top Specification Bar (Goals & Sleep Telemetry) */}
      <TopSpecificationBar
        key={`top-bar-${dataRefreshTrigger}`}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={setSelectedDateKey}
        onDataResetOrSeed={handleDataResetOrSeed}
      />

      {/* Main Execution Surface: Exposed 1px solid hairline grid */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-2 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        {/* SECTION 1: Daily Reflection & Standup Log */}
        <DailyLogSection
          key={`daily-log-${selectedDateKey}-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
        />

        {/* SECTION 2: Desk Telemetry (Carbon Matte Black Instrument Module) */}
        <DeskTrackerSection
          key={`desk-tracker-${selectedDateKey}-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
        />

        {/* SECTION 3: Analytics & Diagnostics (Pure SVG Instruments) */}
        <AnalyticsSection
          key={`analytics-${selectedDateKey}-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
        />
      </main>

      {/* Industrial Hardware Specification Footer Plate */}
      <footer className="w-full bg-panel border-plate-t px-4 py-3 text-text-dim text-[11px] font-mono mt-8">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-text-primary font-bold">
              <Cpu size={14} className="text-braun-orange" />
              <span>DAYMARK // LOCAL-FIRST DESK TELEMETRY</span>
            </div>
            <span className="hidden md:inline border-plate-l pl-3">
              STORAGE: INDEXEDDB (DEXIE.JS)
            </span>
            <span className="hidden lg:inline border-plate-l pl-3">
              CLOCK: MONOTONIC 200MS LOOP
            </span>
          </div>

          {/* Keyboard Hotkey Blueprint Cheat-sheet */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-canvas border border-grid-line px-1.5 py-0.5 font-bold text-text-primary">
                SPACEBAR
              </kbd>
              <span>FLIP ROCKER (FOCUS / DRIFT)</span>
            </span>
            <span className="hidden sm:flex items-center gap-1 border-plate-l pl-3">
              <HardDrive size={12} />
              <span>100% OFFLINE PERSISTENCE</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
