import React from 'react';
import { getLocalDateKey, formatSecondsToDigital } from '../db/db';
import { ChevronLeft, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';
import { SettingsPopover } from './SettingsPopover';

interface TopSpecificationBarProps {
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  onDataResetOrSeed: () => void;
  isClockedIn: boolean;
  currentState: 'focused' | 'distracted';
  currentSessionTotalSec: number;
  currentTab: 'reflection' | 'tracker' | 'analytics';
  onSwitchTab: (tab: 'reflection' | 'tracker' | 'analytics') => void;
  isWidgetMode: boolean;
  onToggleWidgetMode: () => void;
  onOpenShortcuts?: () => void;
}

export const TopSpecificationBar: React.FC<TopSpecificationBarProps> = ({
  selectedDateKey,
  onSelectDateKey,
  onDataResetOrSeed,
  isClockedIn,
  currentState,
  currentSessionTotalSec,
  currentTab,
  onSwitchTab,
  isWidgetMode,
  onToggleWidgetMode,
  onOpenShortcuts,
}) => {
  const todayKey = getLocalDateKey();
  const isToday = selectedDateKey === todayKey;

  const [y, m, d] = selectedDateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekdayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = dateObj.getDate();

  const navigateDay = (offset: number) => {
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() + offset);
    onSelectDateKey(getLocalDateKey(current));
  };

  const isFocused = currentState === 'focused';

  return (
    <header className="w-full bg-[#161618]/80 backdrop-blur-2xl border border-white/10 rounded-full px-4 sm:px-5 py-2.5 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] shrink-0 relative z-50">
      {/* Left: Red dot + DAYMARK ASCII Stamp */}
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_10px_#D71921]" />
        <span className="font-mono font-bold text-xs tracking-wider text-white">
          DAYMARK
        </span>
      </div>

      {/* Center: Date Switcher with Razor-Sharp Mono Day Number */}
      <div className="flex items-center gap-1 text-xs text-white/70">
        <button
          onClick={() => navigateDay(-1)}
          className="p-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
          title="Previous Day"
        >
          <ChevronLeft size={13} />
        </button>

        <span className="font-medium text-white/90 px-1 flex items-center gap-1 text-xs">
          <span>{weekdayShort}, {monthShort}</span>
          <span className="font-mono text-white font-bold">{dayNum}</span>
        </span>

        <button
          onClick={() => navigateDay(1)}
          className="p-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
          title="Next Day"
        >
          <ChevronRight size={13} />
        </button>

        {!isToday && (
          <button
            onClick={() => onSelectDateKey(todayKey)}
            className="ml-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all border border-white/10 hidden sm:inline"
          >
            Today
          </button>
        )}
      </div>

      {/* Right: Timer pill (if running outside tracker) + Widget Mode Toggle + Settings */}
      <div className="flex items-center gap-2">
        {/* Pulsing Timer Mini Pill */}
        {isClockedIn && currentTab !== 'tracker' && !isWidgetMode && (
          <button
            onClick={() => onSwitchTab('tracker')}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono backdrop-blur-xl border transition-all animate-pulse ${
              isFocused
                ? 'bg-[#D71921]/20 border-[#D71921]/40 text-white'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
            }`}
            title="Click to view Desk Tracker"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isFocused ? 'bg-[#D71921]' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-xs">
              {formatSecondsToDigital(currentSessionTotalSec)}
            </span>
            <span className="text-[10px] uppercase font-mono opacity-80 hidden md:inline">
              {isFocused ? 'FOCUS' : 'DRIFT'}
            </span>
          </button>
        )}

        {/* Compact Widget Mode Toggle [ ❐ ] */}
        <button
          onClick={onToggleWidgetMode}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
            isWidgetMode
              ? 'bg-[#D71921] border-[#D71921] text-white shadow-[0_0_12px_rgba(215,25,33,0.5)]'
              : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white/70 hover:text-white'
          }`}
          title={isWidgetMode ? 'Exit Compact Widget Mode' : 'Enter Compact Floating Widget Mode (380px)'}
        >
          {isWidgetMode ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
        </button>

        {/* Settings Popover */}
        <SettingsPopover
          selectedDateKey={selectedDateKey}
          onDataRefresh={onDataResetOrSeed}
          onOpenShortcuts={onOpenShortcuts}
        />
      </div>
    </header>
  );
};
