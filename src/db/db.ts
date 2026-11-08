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
  linkedToGoal: boolean; // 1-click link to short term goal
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
}

export interface GoalRecord {
  id: 'short_term' | 'long_term';
  title: string;
  targetDate: string; // YYYY-MM-DD
  updatedAt: number;
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
    // Default short term: 14 days ahead
    const stDate = new Date(today);
    stDate.setDate(stDate.getDate() + 14);
    // Default long term: 90 days ahead
    const ltDate = new Date(today);
    ltDate.setDate(ltDate.getDate() + 90);

    await db.goals.bulkPut([
      {
        id: 'short_term',
        title: 'Ship Core Industrial Prototype',
        targetDate: getLocalDateKey(stDate),
        updatedAt: Date.now(),
      },
      {
        id: 'long_term',
        title: 'Publish Production Hardware Telemetry Suite',
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
    version: '1.0',
    exportTimestamp: new Date().toISOString(),
    days,
    tasks,
    deskSessions,
    goals,
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

// --- Seed 7-14 Days of Realistic Demo Telemetry ---
export async function seedRealisticDemoTelemetry(): Promise<void> {
  const today = new Date();
  
  // Clear and prepare
  await clearAllTelemetryData();

  // Set goals
  const stDate = new Date(today);
  stDate.setDate(stDate.getDate() + 14);
  const ltDate = new Date(today);
  ltDate.setDate(ltDate.getDate() + 84);

  await db.goals.bulkPut([
    {
      id: 'short_term',
      title: 'Ship Core Hardware Telemetry V1',
      targetDate: getLocalDateKey(stDate),
      updatedAt: Date.now(),
    },
    {
      id: 'long_term',
      title: 'Architect Enterprise Desk Firmware Stack',
      targetDate: getLocalDateKey(ltDate),
      updatedAt: Date.now(),
    },
  ]);

  const daysToInsert: DayRecord[] = [];
  const tasksToInsert: TaskItem[] = [];
  const sessionsToInsert: DeskSession[] = [];

  // Realistic seed parameters for 14 days
  const demoProfiles = [
    { sleepT: '23:15', wakeT: '07:15', focusedH: 5.8, distractedH: 1.1, tasks: ['Refactor state machine monotonic loop', 'Profile memory allocations on 200ms loop', 'Draft Dexie schema documentation'], completed: [true, true, true] },
    { sleepT: '00:30', wakeT: '06:30', focusedH: 4.2, distractedH: 2.8, tasks: ['Resolve race condition in rollover worker', 'Assemble SVG segmented LED meter component', 'Implement keyboard shortcut listener'], completed: [true, false, true] },
    { sleepT: '22:45', wakeT: '06:45', focusedH: 6.4, distractedH: 0.9, tasks: ['Calibrate physical switch sound synthetic audio', 'Implement tactile calibration slider modal', 'Inspect hairline border alignment across viewports'], completed: [true, true, true] },
    { sleepT: '01:15', wakeT: '06:45', focusedH: 3.5, distractedH: 3.4, tasks: ['Audit layout against Braun design specs', 'Write unit tests for sleep duration parser', 'Add JSON export/import handler'], completed: [false, false, true] },
    { sleepT: '23:30', wakeT: '07:30', focusedH: 6.2, distractedH: 1.2, tasks: ['Build 14-day stacked barcode telemetry chart', 'Implement correlation scatterplot for sleep vs distraction', 'Construct 5-slot queue limiter for tomorrow list'], completed: [true, true, true] },
    { sleepT: '00:00', wakeT: '07:00', focusedH: 5.1, distractedH: 1.9, tasks: ['Tune International Orange Braun color variable', 'Verify JetBrains Mono tabular numeric alignment', 'Audit local storage synchronization resilience'], completed: [true, true, false] },
    { sleepT: '23:00', wakeT: '07:15', focusedH: 5.5, distractedH: 1.4, tasks: ['Build mechanical checkbox tick animations', 'Add tactile hover effects on instrument buttons', 'Finalize Dieter Rams inspired title block'], completed: [true, true, true] },
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

    // Create completed desk session
    const sessionStart = new Date(d);
    sessionStart.setHours(9, 30, 0, 0);
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

    // Add tasks
    profile.tasks.forEach((taskTitle, idx) => {
      const isDone = profile.completed[idx];
      tasksToInsert.push({
        id: `task-demo-${dateKey}-${idx}`,
        dateKey,
        listType: 'today',
        title: taskTitle,
        completed: isDone,
        completedAt: isDone ? '16:45' : null,
        rolloverCount: isDone ? 0 : 1,
        linkedToGoal: idx === 0,
        updatedAt: Date.now() - i * 86400000,
      });
    });
  }

  // Today specific tasks (include a 3-day stale rolled over task to test [STALE: 3D] badge!)
  const todayKey = getLocalDateKey(today);
  
  // Make sure today's day record exists
  const existingToday = daysToInsert.find(d => d.dateKey === todayKey);
  if (!existingToday) {
    daysToInsert.push({
      dateKey: todayKey,
      sleepTime: '23:30',
      wakeTime: '07:15',
      sleepDurationMin: calculateSleepMinutes('23:30', '07:15'),
      focusedSeconds: 7200, // 2 hours
      distractedSeconds: 1800, // 30 mins
      updatedAt: Date.now(),
    });
  }

  // Today tasks
  tasksToInsert.push(
    {
      id: `task-today-stale-1`,
      dateKey: todayKey,
      listType: 'today',
      title: 'Audit thermal dispersion on desk MCU heatsink',
      completed: false,
      completedAt: null,
      rolloverCount: 3, // >= 3 displays [STALE: 3D] in amber!
      linkedToGoal: true,
      updatedAt: Date.now(),
    },
    {
      id: `task-today-active-2`,
      dateKey: todayKey,
      listType: 'today',
      title: 'Review monotonic clock drift under suspended browser tabs',
      completed: true,
      completedAt: '11:15',
      rolloverCount: 1,
      linkedToGoal: true,
      updatedAt: Date.now(),
    },
    {
      id: `task-today-active-3`,
      dateKey: todayKey,
      listType: 'today',
      title: 'Verify tactile rocker switch keybinding preventDefault',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: false,
      updatedAt: Date.now(),
    }
  );

  // Tomorrow queue tasks (strictly max 5 slots, let's put 3 items so slot counter shows 3/5)
  tasksToInsert.push(
    {
      id: `task-tmrw-1`,
      dateKey: todayKey,
      listType: 'tomorrow',
      title: 'Run 14-day telemetry diagnostics regression suite',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: true,
      updatedAt: Date.now(),
    },
    {
      id: `task-tmrw-2`,
      dateKey: todayKey,
      listType: 'tomorrow',
      title: 'Benchmark SQLite vs Dexie index access latency',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: false,
      updatedAt: Date.now(),
    },
    {
      id: `task-tmrw-3`,
      dateKey: todayKey,
      listType: 'tomorrow',
      title: 'Order replacement mechanical rotary encoders',
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal: false,
      updatedAt: Date.now(),
    }
  );

  await db.days.bulkPut(daysToInsert);
  await db.tasks.bulkPut(tasksToInsert);
  await db.deskSessions.bulkPut(sessionsToInsert);
}

