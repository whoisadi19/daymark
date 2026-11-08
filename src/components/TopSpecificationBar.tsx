import React, { useState, useEffect, useRef } from 'react';
import { db, getLocalDateKey, calculateSleepMinutes, formatSleepDuration, exportDatabaseToJson, importDatabaseFromJson, seedRealisticDemoTelemetry, clearAllTelemetryData } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { soundEngine } from '../utils/audio';
import { ChevronLeft, ChevronRight, Calendar, Volume2, VolumeX, Download, Upload, RefreshCw, Trash2, Edit3 } from 'lucide-react';
import { GoalModal } from './GoalModal';

interface TopSpecificationBarProps {
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  onDataResetOrSeed: () => void;
}

export const TopSpecificationBar: React.FC<TopSpecificationBarProps> = ({
  selectedDateKey,
  onSelectDateKey,
  onDataResetOrSeed,
}) => {
  const [liveClock, setLiveClock] = useState<string>('');
  const [soundActive, setSoundActive] = useState<boolean>(soundEngine.isEnabled());
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live query for goals
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const shortTermGoal = goals?.find(g => g.id === 'short_term');
  const longTermGoal = goals?.find(g => g.id === 'long_term');

  // Live query for selected day's record (sleep times)
  const currentDayRecord = useLiveQuery(
    () => db.days.get(selectedDateKey),
    [selectedDateKey]
  );

  // Local state for sleep inputs to make typing silky smooth
  const [sleepTime, setSleepTime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');

  useEffect(() => {
    if (currentDayRecord) {
      setSleepTime(currentDayRecord.sleepTime || '');
      setWakeTime(currentDayRecord.wakeTime || '');
    } else {
      setSleepTime('');
      setWakeTime('');
    }
  }, [currentDayRecord, selectedDateKey]);

  // Live system clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const da = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const sc = String(now.getSeconds()).padStart(2, '0');
      setLiveClock(`${yr}.${mo}.${da} // ${hr}:${mi}:${sc}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sleep input handlers
  const handleSleepChange = async (newSleep: string) => {
    setSleepTime(newSleep);
    const duration = calculateSleepMinutes(newSleep, wakeTime);
    const existing = await db.days.get(selectedDateKey);
    await db.days.put({
      dateKey: selectedDateKey,
      sleepTime: newSleep,
      wakeTime: wakeTime,
      sleepDurationMin: duration,
      focusedSeconds: existing?.focusedSeconds || 0,
      distractedSeconds: existing?.distractedSeconds || 0,
      updatedAt: Date.now(),
    });
  };

  const handleWakeChange = async (newWake: string) => {
    setWakeTime(newWake);
    const duration = calculateSleepMinutes(sleepTime, newWake);
    const existing = await db.days.get(selectedDateKey);
    await db.days.put({
      dateKey: selectedDateKey,
      sleepTime: sleepTime,
      wakeTime: newWake,
      sleepDurationMin: duration,
      focusedSeconds: existing?.focusedSeconds || 0,
      distractedSeconds: existing?.distractedSeconds || 0,
      updatedAt: Date.now(),
    });
  };

  // Date navigation handlers
  const navigateDay = (offset: number) => {
    soundEngine.playKeyClick();
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() + offset);
    onSelectDateKey(getLocalDateKey(current));
  };

  const jumpToToday = () => {
    soundEngine.playKeyClick();
    onSelectDateKey(getLocalDateKey());
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundActive;
    soundEngine.setSoundEnabled(next);
    setSoundActive(next);
    if (next) soundEngine.playKeyClick();
  };

  // Backup & Restore
  const handleBackup = async () => {
    soundEngine.playKeyClick();
    const jsonStr = await exportDatabaseToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daymark-backup-${selectedDateKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const success = await importDatabaseFromJson(text);
        if (success) {
          soundEngine.playCheckboxClick(true);
          onDataResetOrSeed();
        } else {
          alert('Invalid Daymark backup JSON format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSeed = async () => {
    if (window.confirm('Seed 7 days of realistic demo telemetry? This will replace current local database.')) {
      soundEngine.playKeyClick();
      await seedRealisticDemoTelemetry();
      onDataResetOrSeed();
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all local telemetry and reset to default?')) {
      soundEngine.playKeyClick();
      await clearAllTelemetryData();
      onDataResetOrSeed();
    }
  };

  // Goal countdown calculations
  const calculateDaysRemaining = (targetDateStr: string | undefined): { text: string; isOverdue: boolean } => {
    if (!targetDateStr) return { text: 'NO TARGET', isOverdue: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays > 0) {
      return { text: `${diffDays}D REMAINING`, isOverdue: false };
    } else if (diffDays === 0) {
      return { text: 'DUE TODAY', isOverdue: false };
    } else {
      return { text: `OVERDUE: ${Math.abs(diffDays)}D`, isOverdue: true };
    }
  };

  const stCountdown = calculateDaysRemaining(shortTermGoal?.targetDate);
  const ltCountdown = calculateDaysRemaining(longTermGoal?.targetDate);

  const calculatedSleepMin = calculateSleepMinutes(sleepTime, wakeTime);
  const isToday = selectedDateKey === getLocalDateKey();

  return (
    <>
      <header className="w-full bg-panel border-plate-b text-text-ink relative z-20">
        {/* Row 1: Architectural Blueprint Title Block & System Info */}
        <div className="flex flex-wrap items-center justify-between border-plate-b px-4 py-2 gap-3 text-xs">
          {/* Logo & Hardware Stamp */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-serif text-lg tracking-tight font-bold text-text-primary">
              <span className="w-3.5 h-3.5 bg-braun-orange inline-block"></span>
              DAYMARK
            </div>
            <span className="hidden sm:inline font-mono text-[10px] text-text-dim border-plate-l pl-3 uppercase">
              SPEC-PLATE // MODEL 24-MKII
            </span>
            <span className="font-mono text-[11px] bg-canvas border border-grid-line px-2 py-0.5 font-medium">
              {liveClock || 'INITIALIZING CLOCK...'}
            </span>
          </div>

          {/* Date Selector Navigation Plate */}
          <div className="flex items-center border border-grid-line bg-canvas">
            <button
              onClick={() => navigateDay(-1)}
              className="p-1.5 hover:bg-panel border-plate-r text-text-dim hover:text-text-primary transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-semibold">
              <Calendar size={13} className="text-text-dim" />
              <span>{selectedDateKey}</span>
              {isToday && (
                <span className="bg-braun-orange text-white text-[9px] px-1.5 py-0.2 uppercase font-bold tracking-wider">
                  TODAY
                </span>
              )}
            </div>
            <button
              onClick={() => navigateDay(1)}
              className="p-1.5 hover:bg-panel border-plate-l text-text-dim hover:text-text-primary transition-colors"
              title="Next Day"
            >
              <ChevronRight size={14} />
            </button>
            {!isToday && (
              <button
                onClick={jumpToToday}
                className="btn-mechanical text-[10px] border-plate-l px-2 py-1"
                title="Return to Today"
              >
                GO TO TODAY
              </button>
            )}
          </div>

          {/* Action Utilities (Audio, Backup, Restore, Seed, Clear) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSound}
              className="btn-mechanical px-2 py-1 gap-1 text-[11px]"
              title={soundActive ? 'Mute Mechanical Sounds' : 'Enable Mechanical Sounds'}
            >
              {soundActive ? <Volume2 size={13} className="text-braun-orange" /> : <VolumeX size={13} className="text-text-dim" />}
              <span className="hidden md:inline">{soundActive ? 'SOUND ON' : 'MUTED'}</span>
            </button>

            <button
              onClick={handleBackup}
              className="btn-mechanical px-2 py-1 gap-1 text-[11px]"
              title="Export Full Local DB as JSON"
            >
              <Download size={13} />
              <span className="hidden lg:inline">BACKUP .JSON</span>
            </button>

            <button
              onClick={handleRestoreClick}
              className="btn-mechanical px-2 py-1 gap-1 text-[11px]"
              title="Import Local DB from JSON"
            >
              <Upload size={13} />
              <span className="hidden lg:inline">RESTORE .JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={handleSeed}
              className="btn-mechanical px-2 py-1 gap-1 text-[11px] text-braun-orange font-bold border-braun-orange/40 hover:border-braun-orange"
              title="Seed 7 Days of Realistic Telemetry & Diagnostics"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">SEED 7D DEMO</span>
            </button>

            <button
              onClick={handleClear}
              className="btn-mechanical px-2 py-1 gap-1 text-[11px] text-text-dim hover:text-ochre-amber"
              title="Clear Database"
            >
              <Trash2 size={13} />
              <span className="hidden xl:inline">CLEAR</span>
            </button>
          </div>
        </div>

        {/* Row 2: Strategic Goals Specification & Today's Sleep Telemetry Pill */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-grid-line">
          {/* Column A: Goals Specs (Short-term & Long-term) */}
          <div className="md:col-span-8 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-canvas/60">
            {/* Short-Term Goal Banner */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 bg-braun-orange inline-block"></span>
                <span className="font-mono text-[10px] font-bold text-braun-orange uppercase tracking-wider">
                  SHORT-TERM GOAL
                </span>
                <span
                  className={`font-mono text-[9px] px-1.5 py-0.5 border font-semibold ${
                    stCountdown.isOverdue
                      ? 'bg-ochre-amber/20 text-ochre-amber border-ochre-amber'
                      : 'bg-panel border-grid-line text-text-primary'
                  }`}
                >
                  [{stCountdown.text}]
                </span>
              </div>
              <p className="font-sans text-xs font-semibold text-text-primary truncate" title={shortTermGoal?.title}>
                {shortTermGoal?.title || 'Ship Core Industrial Prototype'}
              </p>
            </div>

            {/* Long-Term Goal Banner */}
            <div className="flex-1 min-w-0 border-plate-t sm:border-plate-t-0 sm:border-plate-l pt-2 sm:pt-0 sm:pl-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 bg-text-primary inline-block"></span>
                <span className="font-mono text-[10px] font-bold text-text-primary uppercase tracking-wider">
                  LONG-TERM DIRECTION
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-panel border border-grid-line text-text-dim font-semibold">
                  [{ltCountdown.text}]
                </span>
              </div>
              <p className="font-sans text-xs font-semibold text-text-muted truncate" title={longTermGoal?.title}>
                {longTermGoal?.title || 'Publish Production Hardware Telemetry Suite'}
              </p>
            </div>

            {/* Edit Goals Plate Action */}
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                setShowGoalModal(true);
              }}
              className="btn-mechanical text-[10px] self-start sm:self-center shrink-0 px-2 py-1 flex items-center gap-1"
              title="Edit Short & Long Term Goals"
            >
              <Edit3 size={11} />
              <span>EDIT GOALS</span>
            </button>
          </div>

          {/* Column B: Today's Sleep Telemetry Pill */}
          <div className="md:col-span-4 p-3 bg-panel flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 bg-forest-olive inline-block"></span>
                <span className="font-mono text-[10px] font-bold text-text-primary uppercase tracking-wider">
                  SLEEP TELEMETRY
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-text-dim">SLEEP:</span>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => handleSleepChange(e.target.value)}
                    className="bg-canvas border border-grid-line px-1.5 py-0.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-ink"
                    placeholder="23:00"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-text-dim">WAKE:</span>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => handleWakeChange(e.target.value)}
                    className="bg-canvas border border-grid-line px-1.5 py-0.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-ink"
                    placeholder="07:00"
                  />
                </div>
              </div>
            </div>

            {/* Sleep Computed Duration Pill */}
            <div className="bg-canvas border border-grid-line px-2.5 py-1 text-right">
              <span className="block text-[9px] font-mono text-text-dim uppercase tracking-wider">
                DURATION
              </span>
              <span className="font-mono text-xs font-bold text-forest-olive">
                {formatSleepDuration(calculatedSleepMin)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Goal Calibration Modal */}
      {showGoalModal && (
        <GoalModal
          shortTermGoal={shortTermGoal}
          longTermGoal={longTermGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}
    </>
  );
};
