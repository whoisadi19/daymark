import Dexie, { Table } from 'dexie';

export interface DayRecord {
  dateKey: string; // YYYY-MM-DD (primary key)
  sleepTime: string; // HH:MM
  wakeTime: string; // HH:MM
  sleepDurationMin: number; // calculated minutes of sleep
  focusedSeconds: number; // aggregated focused time for this day
  distractedSeconds: number; // aggregated distracted time for this day
  updatedAt: number;
}

export interface TaskItem {
  id: string; // UUID
  dateKey: string; // YYYY-MM-DD
  listType: 'today' | 'tomorrow';
  title: string;
  completed: boolean;
  completedAt: string | null; // e.g. "14:22"
  rolloverCount: number; // tracks how many times rolled over (>= 3 triggers stale badge)
  linkedToGoal: boolean; // 1-click link to goal
  focusedSeconds?: number; // Total focused seconds tracked against this task
  updatedAt: number;
}

export interface DeskSession {
  id: string; // UUID
  dateKey: string; // YYYY-MM-DD
  startedAt: number; // timestamp ms
  endedAt: number | null; // timestamp ms
  focusedSeconds: number;
  distractedSeconds: number;
  status: 'active' | 'completed';
  currentState: 'focused' | 'distracted';
  lastStateChangeAt: number; // timestamp ms
  activeTaskId?: string | null;
}

export interface GoalRecord {
  id: 'short_term' | 'long_term';
  title: string;
  targetDate: string; // YYYY-MM-DD
  updatedAt: number;
}

export interface SleepScheduleConfig {
  baselineSleepTime: string; // e.g. "04:30"
  baselineWakeTime: string;  // e.g. "14:00"
  targetSleepTime: string;   // e.g. "00:00" (12:00 AM)
  targetWakeTime: string;    // e.g. "08:00" (08:00 AM)
  shiftMinutesPerDay: number; // e.g. 15 mins/day
  startDateKey: string;      // YYYY-MM-DD
}

export const SLEEP_SCHEDULE_STORAGE_KEY = 'daymark_sleep_schedule_config_v1';

export const DEFAULT_SLEEP_SCHEDULE: SleepScheduleConfig = {
  baselineSleepTime: '04:30',
  baselineWakeTime: '14:00',
  targetSleepTime: '00:00',
  targetWakeTime: '08:00',
  shiftMinutesPerDay: 15,
  startDateKey: '2026-11-01',
};

export function getSleepScheduleConfig(): SleepScheduleConfig {
  try {
    const raw = localStorage.getItem(SLEEP_SCHEDULE_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SLEEP_SCHEDULE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error reading sleep schedule config', e);
  }
  return DEFAULT_SLEEP_SCHEDULE;
}

export function saveSleepScheduleConfig(cfg: SleepScheduleConfig): void {
  try {
    localStorage.setItem(SLEEP_SCHEDULE_STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Error saving sleep schedule config', e);
  }
}

// Convert "HH:MM" to minutes from midnight
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert minutes from midnight to "HH:MM"
export function minutesToTimeString(minutes: number): string {
  const norm = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Format "HH:MM" to 12-hour AM/PM string, e.g. "04:30 AM"
export function formatTime12Hour(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return '--:--';
  const [h24, m] = timeStr.split(':').map(Number);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// Calculate tonight's target sleep and wake time based on shifting
export function calculateSleepShiftForDate(cfg: SleepScheduleConfig, currentDateKey: string) {
  const [sy, sm, sd] = cfg.startDateKey.split('-').map(Number);
  const [cy, cm, cd] = currentDateKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const current = new Date(cy, cm - 1, cd);

  const diffDays = Math.max(0, Math.round((current.getTime() - start.getTime()) / 86400000));

  // Baseline in minutes
  // Note: 04:30 AM is 270 minutes. 00:00 (12 AM) can be treated as 0 or 24:00 (1440).
  // Shifting earlier means subtracting minutes.
  const baselineSleepMin = timeStringToMinutes(cfg.baselineSleepTime); // 270 min (4:30 AM)
  const baselineWakeMin = timeStringToMinutes(cfg.baselineWakeTime);   // 840 min (14:00 / 2:00 PM)

  const targetSleepMin = timeStringToMinutes(cfg.targetSleepTime);     // 0 min (00:00 / 12:00 AM)
  const targetWakeMin = timeStringToMinutes(cfg.targetWakeTime);       // 480 min (08:00 AM)

  // Distance to shift in minutes:
  // From 04:30 AM (270) down to 00:00 (0): 270 minutes.
  let sleepDistance = baselineSleepMin - targetSleepMin;
  if (sleepDistance < 0) sleepDistance += 1440;

  let wakeDistance = baselineWakeMin - targetWakeMin;
  if (wakeDistance < 0) wakeDistance += 1440;

  const totalDaysNeeded = Math.ceil(Math.max(sleepDistance, wakeDistance) / (cfg.shiftMinutesPerDay || 15));
  const daysRemaining = Math.max(0, totalDaysNeeded - diffDays);

  const totalShiftedMinutes = Math.min(sleepDistance, diffDays * cfg.shiftMinutesPerDay);
  const totalWakeShiftedMinutes = Math.min(wakeDistance, diffDays * cfg.shiftMinutesPerDay);

  let tonightSleepMin = baselineSleepMin - totalShiftedMinutes;
  if (tonightSleepMin < 0) tonightSleepMin += 1440;

  let tonightWakeMin = baselineWakeMin - totalWakeShiftedMinutes;
  if (tonightWakeMin < 0) tonightWakeMin += 1440;

  const tonightSleepStr = minutesToTimeString(tonightSleepMin);
  const tonightWakeStr = minutesToTimeString(tonightWakeMin);

  const isTargetReached = daysRemaining === 0;

  return {
    tonightSleepTime: tonightSleepStr,
    tonightWakeTime: tonightWakeStr,
    daysRemaining,
    totalDaysNeeded,
    diffDays,
    isTargetReached,
  };
}

// Render crisp ASCII progress bar: e.g. [████████████░░░░] 75%
export function renderAsciiProgressBar(percent: number, totalChars = 14): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filledChars = Math.round((clamped / 100) * totalChars);
  const emptyChars = totalChars - filledChars;
  const bar = '█'.repeat(filledChars) + '░'.repeat(emptyChars);
  return `[${bar}] ${clamped}%`;
}

// Format task focused time e.g. "45m" or "1h 15m"
export function formatTaskDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 1) return '<1m';
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export class DaymarkDatabase extends Dexie {
  days!: Table<DayRecord, string>;
  tasks!: Table<TaskItem, string>;
  deskSessions!: Table<DeskSession, string>;
  goals!: Table<GoalRecord, string>;

  constructor() {
    super('DaymarkDB');
    this.version(1).stores({
      days: 'dateKey, sleepDurationMin, focusedSeconds, distractedSeconds, updatedAt',
      tasks: 'id, dateKey, listType, completed, rolloverCount, linkedToGoal, [dateKey+listType]',
      deskSessions: 'id, dateKey, startedAt, status, currentState',
      goals: 'id, targetDate',
    });
  }
}

export const db = new DaymarkDatabase();

// --- Utility: Format date to YYYY-MM-DD ---
export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Utility: Calculate sleep duration in minutes ---
export function calculateSleepMinutes(sleepTime: string, wakeTime: string): number {
  if (!sleepTime || !wakeTime || !sleepTime.includes(':') || !wakeTime.includes(':')) {
    return 0;
  }
  const [sH, sM] = sleepTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(wH) || isNaN(wM)) return 0;

  let sleepMinutes = sH * 60 + sM;
  let wakeMinutes = wH * 60 + wM;

  // If wake time is earlier in the day or equal, it crossed midnight (e.g., 23:30 to 07:15)
  if (wakeMinutes <= sleepMinutes) {
    wakeMinutes += 24 * 60;
  }

  return Math.max(0, wakeMinutes - sleepMinutes);
}

// Format minutes to "07h 45m"
export function formatSleepDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '--h --m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

// Format seconds to "02h 15m 30s" or "02h 15m"
export function formatSecondsToDigital(seconds: number, includeSeconds = true): string {
  const totalSec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (!includeSeconds) {
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- Initialize Default Goals if empty ---
export async function ensureDefaultGoals(): Promise<void> {
  const count = await db.goals.count();
  if (count === 0) {
    const today = new Date();
    const stDate = new Date(today);
    stDate.setDate(stDate.getDate() + 14);
    const ltDate = new Date(today);
    ltDate.setDate(ltDate.getDate() + 90);

    await db.goals.bulkPut([
      {
        id: 'short_term',
        title: 'Shift Sleep 15m Earlier Daily',
        targetDate: getLocalDateKey(stDate),
        updatedAt: Date.now(),
      },
      {
        id: 'long_term',
        title: 'Consistent 12:00 AM -> 08:00 AM Sleep Schedule',
        targetDate: getLocalDateKey(ltDate),
        updatedAt: Date.now(),
      },
    ]);
  }
}

// --- JSON Export Utility ---
export async function exportDatabaseToJson(): Promise<string> {
  const [days, tasks, deskSessions, goals] = await Promise.all([
    db.days.toArray(),
    db.tasks.toArray(),
    db.deskSessions.toArray(),
    db.goals.toArray(),
  ]);

  const backupData = {
    version: '2.0',
    exportTimestamp: new Date().toISOString(),
    days,
    tasks,
    deskSessions,
    goals,
    sleepSchedule: getSleepScheduleConfig(),
  };

  return JSON.stringify(backupData, null, 2);
}

// --- JSON Import Utility ---
export async function importDatabaseFromJson(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format');
    }

    await db.transaction('rw', [db.days, db.tasks, db.deskSessions, db.goals], async () => {
      await db.days.clear();
      await db.tasks.clear();
      await db.deskSessions.clear();
      await db.goals.clear();

      if (Array.isArray(data.days) && data.days.length > 0) {
        await db.days.bulkPut(data.days);
      }
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        await db.tasks.bulkPut(data.tasks);
      }
      if (Array.isArray(data.deskSessions) && data.deskSessions.length > 0) {
        await db.deskSessions.bulkPut(data.deskSessions);
      }
      if (Array.isArray(data.goals) && data.goals.length > 0) {
        await db.goals.bulkPut(data.goals);
      }
      if (data.sleepSchedule) {
        saveSleepScheduleConfig(data.sleepSchedule);
      }
    });

    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
}

// --- Clear All Data & Reset ---
export async function clearAllTelemetryData(): Promise<void> {
  await db.transaction('rw', [db.days, db.tasks, db.deskSessions, db.goals], async () => {
    await db.days.clear();
    await db.tasks.clear();
    await db.deskSessions.clear();
    await db.goals.clear();
  });
  await ensureDefaultGoals();
}

// --- Seed 7 Days of Realistic Demo Telemetry ---
export async function seedRealisticDemoTelemetry(): Promise<void> {
  const today = new Date();
  await clearAllTelemetryData();

  const daysToInsert: DayRecord[] = [];
  const tasksToInsert: TaskItem[] = [];
  const sessionsToInsert: DeskSession[] = [];

  // Realistic sleep shift demo data: shifting from 04:30 AM / 14:00 down toward 01:00 AM / 09:30 AM
  const demoProfiles = [
    { sleepT: '04:30', wakeT: '14:00', focusedH: 4.8, distractedH: 1.8, tasks: ['Configure Web App Manifest & Service Worker', 'Fix z-index stacking on settings popover', 'Map out 15m/day sleep shifting formula'], completed: [true, true, true], taskTimes: [3600, 2400, 2800] },
    { sleepT: '04:00', wakeT: '13:15', focusedH: 5.2, distractedH: 1.5, tasks: ['Refactor monospace timer typography', 'Implement task selector dropdown in tracker', 'Review midnight rollover promoting tomorrow queue'], completed: [true, true, false], taskTimes: [4200, 3600, 0] },
    { sleepT: '03:30', wakeT: '12:30', focusedH: 5.8, distractedH: 1.2, tasks: ['Construct 7-day sleep schedule floating graph', 'Test compact floating widget layout', 'Add animated ASCII state indicators'], completed: [true, true, true], taskTimes: [5400, 3600, 4200] },
    { sleepT: '03:15', wakeT: '12:00', focusedH: 6.0, distractedH: 1.0, tasks: ['Calibrate sleep duration delta cross-midnight', 'Per-task time breakdown aggregation', 'Audit offline font caching'], completed: [true, true, true], taskTimes: [4800, 4800, 2400] },
    { sleepT: '02:45', wakeT: '11:15', focusedH: 6.4, distractedH: 0.9, tasks: ['Wire Reset timer confirmation button', 'Refactor tab labels to plain English', 'Test mobile layout on Android viewport'], completed: [true, true, true], taskTimes: [6000, 3600, 2400] },
    { sleepT: '02:15', wakeT: '10:30', focusedH: 6.8, distractedH: 0.8, tasks: ['Validate PWA install prompt event handler', 'Verify stale rollover 3D warning pill', 'Audit service worker caching strategy'], completed: [true, true, false], taskTimes: [7200, 3600, 0] },
    { sleepT: '01:45', wakeT: '09:45', focusedH: 7.2, distractedH: 0.7, tasks: ['Final regression pass across 3 tabs', 'Compact desktop widget mode hotkey', 'Verify ASCII block bar rendering'], completed: [true, true, true], taskTimes: [7200, 4800, 3600] },
  ];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = getLocalDateKey(d);
    const profile = demoProfiles[6 - i];

    const sleepMin = calculateSleepMinutes(profile.sleepT, profile.wakeT);
    const focusedSec = Math.round(profile.focusedH * 3600);
    const distractedSec = Math.round(profile.distractedH * 3600);

    daysToInsert.push({
      dateKey,
      sleepTime: profile.sleepT,
      wakeTime: profile.wakeT,
      sleepDurationMin: sleepMin,
      focusedSeconds: focusedSec,
      distractedSeconds: distractedSec,
      updatedAt: Date.now() - i * 86400000,
    });

    const sessionStart = new Date(d);
    sessionStart.setHours(14, 0, 0, 0);
    sessionsToInsert.push({
      id: `session-demo-${dateKey}`,
      dateKey,
      startedAt: sessionStart.getTime(),
      endedAt: sessionStart.getTime() + (focusedSec + distractedSec) * 1000,
      focusedSeconds: focusedSec,
      distractedSeconds: distractedSec,
      status: 'completed',
      currentState: 'focused',
      lastStateChangeAt: sessionStart.getTime() + (focusedSec + distractedSec) * 1000,
    });

    profile.tasks.forEach((taskTitle, idx) => {
      const isDone = profile.completed[idx];
      tasksToInsert.push({
        id: `task-demo-${dateKey}-${idx}`,
        dateKey,
        listType: 'today',
        title: taskTitle,
        completed: isDone,
        completedAt: isDone ? '18:30' : null,
        rolloverCount: isDone ? 0 : 1,
        linkedToGoal: idx === 0,
        focusedSeconds: profile.taskTimes[idx] || 0,
        updatedAt: Date.now() - i * 86400000,
      });
    });
  }

  // Today specific tasks
  const todayKey = getLocalDateKey(today);
  const existingToday = daysToInsert.find(d => d.dateKey === todayKey);
  if (!existingToday) {
    daysToInsert.push({
      dateKey: todayKey,
      sleepTime: '01:30',
      wakeTime: '09:30',
      sleepDurationMin: calculateSleepMinutes('01:30', '09:30'),
      focusedSeconds: 3600,
      distractedSeconds: 600,
      updatedAt: Date.now(),
    });
  }

  // Today execution checklist
  tasksToInsert.push(
    {
      id: 'task-today-1',
      dateKey: todayKey,
      listType: 'today',
      title: 'Review Linux system daemon logs',
      completed: true,
      completedAt: '12:45',
      rolloverCount: 0,
      linkedToGoal: true,
      focusedSeconds: 2700, // 45m
      updatedAt: Date.now(),
    },
    {
      id: 'task-today-2',
      dateKey: todayKey,
      listType: 'today',
      title: 'Refactor sleep schedule shifter algorithm',
      completed: false,
      completedAt: null,
      rolloverCount: 3, // >= 3 shows 3D stale badge!
      linkedToGoal: true,
      focusedSeconds: 1800, // 30m
      updatedAt: Date.now(),
    },
    {
      id: 'task-today-3',
      dateKey: todayKey,
      listType: 'today',
      title: 'Test offline PWA service worker caching',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: false,
      focusedSeconds: 900, // 15m
      updatedAt: Date.now(),
    }
  );

  // Tomorrow queue (capped at 5)
  tasksToInsert.push(
    {
      id: 'task-tmrw-1',
      dateKey: todayKey,
      listType: 'tomorrow',
      title: 'Calibrate tonight target bedtime at 01:15 AM',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: true,
      focusedSeconds: 0,
      updatedAt: Date.now(),
    },
    {
      id: 'task-tmrw-2',
      dateKey: todayKey,
      listType: 'tomorrow',
      title: 'Benchmark SQLite vs IndexedDB read latency',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: false,
      focusedSeconds: 0,
      updatedAt: Date.now(),
    }
  );

  await db.days.bulkPut(daysToInsert);
  await db.tasks.bulkPut(tasksToInsert);
  await db.deskSessions.bulkPut(sessionsToInsert);

  saveSleepScheduleConfig({
    baselineSleepTime: '04:30',
    baselineWakeTime: '14:00',
    targetSleepTime: '00:00',
    targetWakeTime: '08:00',
    shiftMinutesPerDay: 15,
    startDateKey: '2026-11-01',
  });
}
