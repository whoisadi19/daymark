import React from 'react';
import { getLocalDateKey, formatSecondsToDigital } from '../db/db';
import {
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  Minus,
  Square,
  X,
} from 'lucide-react';
import { SettingsPopover } from './SettingsPopover';
import {
  minimizeNativeWindow,
  toggleMaximizeNativeWindow,
  closeNativeWindow,
  handleWindowDrag,
} from '../utils/tauriWindow';

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
    <header
      data-tauri-drag-region
      onMouseDown={handleWindowDrag}
      className="w-full bg-white/[0.07] backdrop-blur-2xl border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-full px-4 sm:px-5 py-2 flex items-center justify-between shrink-0 relative z-50 select-none cursor-move"
    >
      {/* Left: Red dot + DAYMARK Brand */}
      <div className="flex items-center gap-2.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#D71921] shadow-[0_0_10px_#D71921]" />
        <span className="font-mono font-bold text-xs tracking-wider text-white">
          DAYMARK
        </span>
      </div>

      {/* Center: Date Switcher with Razor-Sharp Mono Day Number */}
      <div className="flex items-center gap-1 text-xs text-white/70">
        <button
          onClick={() => navigateDay(-1)}
          className="p-1 rounded-full hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Previous Day"
        >
          <ChevronLeft size={13} />
        </button>

        <span className="font-medium text-white/90 px-1 flex items-center gap-1 text-xs pointer-events-none">
          <span>{weekdayShort}, {monthShort}</span>
          <span className="font-mono text-white font-bold">{dayNum}</span>
        </span>

        <button
          onClick={() => navigateDay(1)}
          className="p-1 rounded-full hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Next Day"
        >
          <ChevronRight size={13} />
        </button>

        {!isToday && (
          <button
            onClick={() => onSelectDateKey(todayKey)}
            className="ml-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all border border-white/10 hidden sm:inline cursor-pointer"
          >
            Today
          </button>
        )}
      </div>

      {/* Right: Timer pill (if running outside tracker) + Settings + 4 Window Controls */}
      <div className="flex items-center gap-1.5">
        {/* Pulsing Timer Mini Pill */}
        {isClockedIn && currentTab !== 'tracker' && !isWidgetMode && (
          <button
            onClick={() => onSwitchTab('tracker')}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono backdrop-blur-xl border transition-all animate-pulse mr-1 cursor-pointer ${
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

        {/* Settings Popover */}
        <SettingsPopover
          selectedDateKey={selectedDateKey}
          onDataRefresh={onDataResetOrSeed}
          onOpenShortcuts={onOpenShortcuts}
        />

        {/* 4 Frosted Window Buttons (Widget Toggle, Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1 pl-1 ml-1 border-l border-white/15">
          {/* 1. Widget / Full Size Toggle */}
          <button
            onClick={onToggleWidgetMode}
            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              isWidgetMode
                ? 'bg-[#D71921] border-[#D71921] text-white shadow-[0_0_12px_rgba(215,25,33,0.5)]'
                : 'bg-white/[0.08] hover:bg-white/[0.18] border-white/15 text-white/70 hover:text-white'
            }`}
            title={isWidgetMode ? 'Exit Compact Widget Mode (Restore 900x640)' : 'Switch to Mini Widget (380x460 Always-On-Top)'}
          >
            {isWidgetMode ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>

          {/* 2. Minimize */}
          <button
            onClick={minimizeNativeWindow}
            className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            title="Minimize Window"
          >
            <Minus size={12} />
          </button>

          {/* 3. Maximize / Restore */}
          <button
            onClick={toggleMaximizeNativeWindow}
            className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            title="Maximize / Restore"
          >
            <Square size={11} />
          </button>

          {/* 4. Close */}
          <button
            onClick={closeNativeWindow}
            className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-[#D71921] hover:border-[#D71921] border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            title="Close DAYMARK"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </header>
  );
};
