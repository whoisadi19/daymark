import React, { useState, useEffect } from 'react';
import { getLocalDateKey, ensureDefaultGoals } from './db/db';
import { useDeskTimer } from './hooks/useDeskTimer';
import { TopSpecificationBar } from './components/TopSpecificationBar';
import { DailyLogSection } from './components/DailyLogSection';
import { DeskTrackerSection } from './components/DeskTrackerSection';
import { AnalyticsSection } from './components/AnalyticsSection';
import { WidgetView } from './components/WidgetView';
import { ShortcutsModal } from './components/ShortcutsModal';
import { resizeNativeWindowForMode } from './utils/tauriWindow';

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
      resizeNativeWindowForMode(next);
      return next;
    });
  };

  // Immediate window resizing on initial mount
  useEffect(() => {
    resizeNativeWindowForMode(isWidgetMode);
  }, [isWidgetMode]);

  // Listen for tray menu commands ("set-mode": "widget" or "full")
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<string>('set-mode', (event) => {
          if (event.payload === 'widget') {
            setIsWidgetMode(true);
            resizeNativeWindowForMode(true);
          } else if (event.payload === 'full') {
            setIsWidgetMode(false);
            resizeNativeWindowForMode(false);
          }
        });
      } catch (err) {
        console.warn('Tauri event listener setup failed:', err);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

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
  // COMPACT FLOATING WIDGET VIEWPORT (380px x 460px)
  // ZERO MARGIN, EDGE-TO-EDGE ROUNDED SHELL
  // ==============================================================
  if (isWidgetMode) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-transparent m-0 p-0 select-none">
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
  // FULL 3-TAB APPLICATION VIEWPORT (900px x 640px)
  // ZERO BLACK MARGIN, TRANSLUCENT SMOKED FROSTED GLASS SHELL
  // ==============================================================
  return (
    <div className="w-screen h-screen rounded-[28px] overflow-hidden bg-[#121216]/75 backdrop-blur-2xl border border-white/20 shadow-2xl text-[#F2F2F4] relative selection:bg-[#D71921] selection:text-white font-sans flex flex-col p-4 sm:p-5 select-none box-border">
      {/* ============================================================== */}
      {/* VIBRANT AMBIENT LIGHT ORBS (MAKES FROSTED GLASS TRULY POP) */}
      {/* ============================================================== */}
      <div className="w-[360px] h-[360px] rounded-full bg-[#D71921]/35 blur-[70px] absolute top-10 right-10 pointer-events-none" />
      <div className="w-[380px] h-[380px] rounded-full bg-white/15 blur-[80px] absolute -bottom-10 -left-10 pointer-events-none" />
      <div className="w-[280px] h-[280px] rounded-full bg-white/10 blur-[60px] absolute top-1/3 left-1/3 pointer-events-none" />
      {/* Subtle fluted glass scanline texture */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:10px_100%] pointer-events-none opacity-80" />

      {/* ============================================================== */}
      {/* MAIN CONTAINER (FITS 900x640 WINDOW WITH ZERO OVERFLOW) */}
      {/* ============================================================== */}
      <div className="w-full h-full flex flex-col justify-between relative z-10 gap-3 max-w-[820px] mx-auto overflow-hidden">
        {/* Top Minimal Status Pill Bar (Draggable on Linux) */}
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
        <main className="flex-1 flex flex-col justify-center my-auto w-full overflow-hidden">
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
        <nav className="w-full flex justify-center shrink-0 pt-1 pb-1">
          <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/20 rounded-full p-1 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex items-center gap-1">
            {/* Tab 1: 01 · Reflection */}
            <button
              onClick={() => setActiveTab('reflection')}
              className={`rounded-full px-4 py-1.5 text-xs transition-all duration-200 select-none cursor-pointer ${
                activeTab === 'reflection'
                  ? 'bg-[#ECECEF] text-[#0A0A0C] font-semibold shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <span className="font-mono mr-1">01</span>
              <span>· Reflection</span>
            </button>

            {/* Tab 2: 02 · Tracker */}
            <button
              onClick={() => setActiveTab('tracker')}
              className={`rounded-full px-4 py-1.5 text-xs transition-all duration-200 select-none flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tracker'
                  ? 'bg-[#ECECEF] text-[#0A0A0C] font-semibold shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
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
              className={`rounded-full px-4 py-1.5 text-xs transition-all duration-200 select-none cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#ECECEF] text-[#0A0A0C] font-semibold shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
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
