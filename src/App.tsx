import React, { useState, useEffect } from 'react';
import { getLocalDateKey, ensureDefaultGoals } from './db/db';
import { useDeskTimer } from './hooks/useDeskTimer';
import { TopSpecificationBar } from './components/TopSpecificationBar';
import { DailyLogSection } from './components/DailyLogSection';
import { DeskTrackerSection } from './components/DeskTrackerSection';
import { AnalyticsSection } from './components/AnalyticsSection';
import { WidgetView } from './components/WidgetView';
import { ShortcutsModal } from './components/ShortcutsModal';

type ActiveTab = 'reflection' | 'tracker' | 'analytics';

export const App: React.FC = () => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey());
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tracker');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Widget mode: detect via query param ?mode=widget or toggle state
  const [isWidgetMode, setIsWidgetMode] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'widget';
    } catch {
      return false;
    }
  });

  const toggleWidgetMode = () => {
    setIsWidgetMode((prev) => {
      const next = !prev;
      try {
        const url = new URL(window.location.href);
        if (next) {
          url.searchParams.set('mode', 'widget');
        } else {
          url.searchParams.delete('mode');
        }
        window.history.replaceState({}, '', url.toString());
      } catch (e) {
        console.error('Failed to update URL search params', e);
      }
      return next;
    });
  };

  // Shared Desk Timer for top bar live pill, tracker tab, and widget view
  const deskTimer = useDeskTimer(selectedDateKey);

  useEffect(() => {
    ensureDefaultGoals();
  }, []);

  const handleDataResetOrSeed = () => {
    setDataRefreshTrigger((prev) => prev + 1);
  };

  // Keyboard shortcut listener for tab switching & shortcuts modal (? key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target?.tagName?.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

      if (isInput) return;

      if (e.key === '1') {
        setActiveTab('reflection');
      } else if (e.key === '2') {
        setActiveTab('tracker');
      } else if (e.key === '3') {
        setActiveTab('analytics');
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ==============================================================
  // COMPACT FLOATING WIDGET VIEWPORT (380px x 420px)
  // ==============================================================
  if (isWidgetMode) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-[#F2F2F4] relative selection:bg-[#D71921] selection:text-white font-sans overflow-x-hidden flex flex-col items-center justify-center p-3 sm:p-6">
        {/* Atmospheric Ambient Glow behind widget */}
        <div className="fixed inset-0 -z-10 bg-[#0A0A0C] overflow-hidden pointer-events-none">
          <div className="w-[300px] h-[300px] rounded-full bg-[#D71921]/15 blur-[90px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <WidgetView
          selectedDateKey={selectedDateKey}
          timer={deskTimer}
          onExitWidgetMode={toggleWidgetMode}
        />

        {isShortcutsOpen && <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
      </div>
    );
  }

  // ==============================================================
  // FULL 3-TAB APPLICATION VIEWPORT
  // ==============================================================
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F2F4] relative selection:bg-[#D71921] selection:text-white font-sans overflow-x-hidden flex flex-col">
      {/* ============================================================== */}
      {/* ATMOSPHERIC FROSTED WALLPAPER CANVAS (BACKGROUND LAYER) */}
      {/* ============================================================== */}
      <div className="fixed inset-0 -z-10 bg-[#0A0A0C] overflow-hidden pointer-events-none">
        {/* Soft, blurred monochrome geometric capsule in center */}
        <div className="w-[420px] h-[520px] rounded-full bg-white/[0.04] blur-3xl absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2" />

        {/* Subtle Nothing Crimson ambient glow sphere near center-right */}
        <div className="w-[280px] h-[280px] rounded-full bg-[#D71921]/20 blur-[100px] absolute top-1/3 right-1/4 pointer-events-none" />

        {/* Fluted glass vertical scanline texture */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:12px_100%] pointer-events-none opacity-80" />
      </div>

      {/* ============================================================== */}
      {/* MAIN CONTAINER (MAX 760PX AIRY BENTO COLUMN) */}
      {/* ============================================================== */}
      <div className="max-w-[760px] mx-auto w-full min-h-screen flex flex-col justify-between py-6 px-4 sm:py-8 sm:px-5 relative z-10 gap-6">
        {/* Top Minimal Status Pill Bar */}
        <TopSpecificationBar
          key={`top-bar-${dataRefreshTrigger}`}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
          onDataResetOrSeed={handleDataResetOrSeed}
          isClockedIn={deskTimer.isClockedIn}
          currentState={deskTimer.currentState}
          currentSessionTotalSec={deskTimer.currentSessionTotalSec}
          currentTab={activeTab}
          onSwitchTab={setActiveTab}
          isWidgetMode={isWidgetMode}
          onToggleWidgetMode={toggleWidgetMode}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        {/* ============================================================== */}
        {/* STRICT 3-TAB CONTENT AREA (ONLY ONE VIEW VISIBLE AT A TIME) */}
        {/* ============================================================== */}
        <main className="flex-1 flex flex-col justify-center my-auto w-full">
          {activeTab === 'reflection' && (
            <DailyLogSection
              key={`daily-log-${selectedDateKey}-${dataRefreshTrigger}`}
              selectedDateKey={selectedDateKey}
            />
          )}

          {activeTab === 'tracker' && (
            <DeskTrackerSection
              key={`desk-tracker-${selectedDateKey}-${dataRefreshTrigger}`}
              selectedDateKey={selectedDateKey}
              timer={deskTimer}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsSection
              key={`analytics-${selectedDateKey}-${dataRefreshTrigger}`}
              selectedDateKey={selectedDateKey}
              onSelectDateKey={setSelectedDateKey}
            />
          )}
        </main>

        {/* ============================================================== */}
        {/* BOTTOM NOTHING OS FLOATING PILL DOCK */}
        {/* ============================================================== */}
        <nav className="w-full flex justify-center sticky bottom-4 z-40 pt-2">
          <div className="bg-[#161618]/85 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex items-center gap-1">
            {/* Tab 1: 01 · Reflection */}
            <button
              onClick={() => setActiveTab('reflection')}
              className={`rounded-full px-4 py-2 text-xs transition-all duration-200 select-none ${
                activeTab === 'reflection'
                  ? 'bg-[#ECECEF] text-[#0A0A0C] font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span className="font-mono mr-1">01</span>
              <span>· Reflection</span>
            </button>

            {/* Tab 2: 02 · Tracker */}
            <button
              onClick={() => setActiveTab('tracker')}
              className={`rounded-full px-4 py-2 text-xs transition-all duration-200 select-none flex items-center gap-1.5 ${
                activeTab === 'tracker'
                  ? 'bg-[#ECECEF] text-[#0A0A0C] font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span className="font-mono">02</span>
              <span>· Tracker</span>
              {deskTimer.isClockedIn && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    deskTimer.currentState === 'focused'
                      ? 'bg-[#D71921]'
                      : 'bg-amber-400'
                  } animate-pulse`}
                />
              )}
            </button>

            {/* Tab 3: 03 · Analytics */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`rounded-full px-4 py-2 text-xs transition-all duration-200 select-none ${
                activeTab === 'analytics'
                  ? 'bg-[#ECECEF] text-[#0A0A0C] font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span className="font-mono mr-1">03</span>
              <span>· Analytics</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Keyboard Shortcuts Cheat-Sheet Modal */}
      {isShortcutsOpen && <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
    </div>
  );
};

export default App;
