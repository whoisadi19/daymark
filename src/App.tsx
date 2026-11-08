import React, { useState, useEffect } from 'react';
import { getLocalDateKey, ensureDefaultGoals } from './db/db';
import { TopSpecificationBar } from './components/TopSpecificationBar';
import { DailyLogSection } from './components/DailyLogSection';
import { DeskTrackerSection } from './components/DeskTrackerSection';
import { AnalyticsSection } from './components/AnalyticsSection';

export const App: React.FC = () => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey());
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState<number>(0);

  // Ensure default goals are initialized
  useEffect(() => {
    ensureDefaultGoals();
  }, []);

  const handleDataResetOrSeed = () => {
    setDataRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] antialiased">
      {/* Centered, breathable single column */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Header: Brand, Date Switcher, Inline Sleep & Clickable Goals */}
        <TopSpecificationBar
          key={`top-bar-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
          onDataResetOrSeed={handleDataResetOrSeed}
        />

        {/* Hero Section: Desk Tracker (Top Centerpiece) */}
        <DeskTrackerSection
          key={`desk-tracker-${selectedDateKey}-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
        />

        {/* Middle Section: Two Clean Columns (Today & Tomorrow) */}
        <DailyLogSection
          key={`daily-log-${selectedDateKey}-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
        />

        {/* Bottom Section: Minimalist Diagnostics */}
        <AnalyticsSection
          key={`analytics-${selectedDateKey}-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
        />
      </div>
    </div>
  );
};

export default App;
