import React, { useState, useEffect } from 'react';
import { getLocalDateKey, ensureDefaultGoals } from './db/db';
import { TopSpecificationBar } from './components/TopSpecificationBar';
import { DailyLogSection } from './components/DailyLogSection';
import { DeskTrackerSection } from './components/DeskTrackerSection';
import { AnalyticsSection } from './components/AnalyticsSection';

export const App: React.FC = () => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey());
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    ensureDefaultGoals();
  }, []);

  const handleDataResetOrSeed = () => {
    setDataRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#E8E6DF] text-[#111110] antialiased">
      {/* Widescreen 1360px Bento Grid Workspace */}
      <div className="max-w-[1360px] mx-auto min-h-screen p-3 sm:p-4 md:p-6 flex flex-col gap-3">
        {/* Top Instrument Strip (h-14) */}
        <TopSpecificationBar
          key={`top-bar-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
          onDataResetOrSeed={handleDataResetOrSeed}
        />

        {/* Main 12-Column Bento Grid */}
        <main className="grid grid-cols-12 gap-3 flex-1 items-stretch">
          {/* Left Column (5 Cols): Telemetry + Diagnostics Bento Cards */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
            {/* Card 1: Desk Telemetry Instrument */}
            <DeskTrackerSection
              key={`desk-tracker-${selectedDateKey}-${dataRefreshTrigger}`}
              selectedDateKey={selectedDateKey}
            />

            {/* Card 2: Diagnostics & 14-Day Telemetry */}
            <AnalyticsSection
              key={`analytics-${selectedDateKey}-${dataRefreshTrigger}`}
              selectedDateKey={selectedDateKey}
              onSelectDateKey={setSelectedDateKey}
            />
          </div>

          {/* Right Column (7 Cols): Today & Tomorrow Execution Cards */}
          <DailyLogSection
            key={`daily-log-${selectedDateKey}-${dataRefreshTrigger}`}
            selectedDateKey={selectedDateKey}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
