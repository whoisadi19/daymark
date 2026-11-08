import React from 'react';
import { getLocalDateKey, formatSecondsToDigital } from '../db/db';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <header className="w-full bg-[#161618]/70 backdrop-blur-2xl border border-white/10 rounded-full px-5 py-2.5 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] shrink-0">
      {/* Left: Red dot + DAYMARK */}
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_10px_#D71921]" />
        <span className="font-ndot text-sm tracking-widest text-white">
          DAYMARK
        </span>
      </div>

      {/* Center: Date Switcher with NDot day number */}
      <div className="flex items-center gap-1.5 text-xs text-white/70">
        <button
          onClick={() => navigateDay(-1)}
          className="p-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
          title="Previous Day"
        >
          <ChevronLeft size={13} />
        </button>

        <span className="font-medium text-white/90 px-1 flex items-center gap-1">
          <span>{weekdayShort}, {monthShort}</span>
          <span className="font-ndot text-white font-bold">{dayNum}</span>
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
            className="ml-1 text-[10px] font-ndot uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all border border-white/10"
          >
            Today
          </button>
        )}
      </div>

      {/* Right: Live Pulsing Timer Mini Pill (when on other tabs) + Settings */}
      <div className="flex items-center gap-2.5">
        {isClockedIn && currentTab !== 'tracker' && (
          <button
            onClick={() => onSwitchTab('tracker')}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono backdrop-blur-xl border transition-all animate-pulse ${
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
            <span className="font-ndot text-xs">
              {formatSecondsToDigital(currentSessionTotalSec)}
            </span>
            <span className="text-[10px] uppercase font-ndot opacity-80 hidden sm:inline">
              {isFocused ? 'FOCUSED' : 'DRIFTING'}
            </span>
          </button>
        )}

        <SettingsPopover
          selectedDateKey={selectedDateKey}
          onDataRefresh={onDataResetOrSeed}
        />
      </div>
    </header>
  );
};
