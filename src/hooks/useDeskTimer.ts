import { useState, useEffect, useCallback, useRef } from 'react';
import { db, getLocalDateKey, DeskSession } from '../db/db';
import { soundEngine } from '../utils/audio';

const STORAGE_KEY = 'daymark_active_desk_session_v2';
const ACTIVE_TASK_STORAGE_KEY = 'daymark_active_task_id_v2';

export interface ActiveSessionState {
  id: string;
  dateKey: string;
  startedAt: number;
  lastStateChangeAt: number;
  accumulatedFocusedMs: number;
  accumulatedDistractedMs: number;
  currentState: 'focused' | 'distracted';
  activeTaskId?: string | null;
}

export interface CalibrationData {
  sessionId: string;
  dateKey: string;
  startedAt: number;
  endedAt: number;
  initialFocusedMs: number;
  initialDistractedMs: number;
  totalMs: number;
}

export function useDeskTimer(selectedDateKey: string) {
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading stored session', e);
    }
    return null;
  });

  const [activeTaskId, setActiveTaskIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_TASK_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [tick, setTick] = useState<number>(Date.now());
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);

  // Totals for completed sessions on the selected date
  const [completedTodayFocusedSec, setCompletedTodayFocusedSec] = useState<number>(0);
  const [completedTodayDistractedSec, setCompletedTodayDistractedSec] = useState<number>(0);

  // Refs to hold current values for background loops
  const activeSessionRef = useRef<ActiveSessionState | null>(activeSession);
  activeSessionRef.current = activeSession;

  const activeTaskIdRef = useRef<string | null>(activeTaskId);
  activeTaskIdRef.current = activeTaskId;

  // Set active task id
  const setActiveTaskId = useCallback((id: string | null) => {
    setActiveTaskIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_TASK_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_TASK_STORAGE_KEY);
    }
    if (activeSessionRef.current) {
      activeSessionRef.current.activeTaskId = id;
      setActiveSession({ ...activeSessionRef.current, activeTaskId: id });
    }
  }, []);

  // Query completed sessions for the selected date
  const refreshCompletedDayTotals = useCallback(async (dateKey: string) => {
    try {
      const sessions = await db.deskSessions
        .where('dateKey')
        .equals(dateKey)
        .and(s => s.status === 'completed')
        .toArray();

      const totalFoc = sessions.reduce((acc, s) => acc + (s.focusedSeconds || 0), 0);
      const totalDis = sessions.reduce((acc, s) => acc + (s.distractedSeconds || 0), 0);

      setCompletedTodayFocusedSec(totalFoc);
      setCompletedTodayDistractedSec(totalDis);
    } catch (err) {
      console.error('Error calculating day totals', err);
    }
  }, []);

  // Refresh totals whenever selectedDateKey changes
  useEffect(() => {
    refreshCompletedDayTotals(selectedDateKey);
  }, [selectedDateKey, refreshCompletedDayTotals]);

  // 200ms render loop for live monotonic delta updates
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      setTick(Date.now());
    }, 200);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Sync activeSession to localStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeSession]);

  // Periodic persistence of active session to Dexie and task time attribution (every 3 seconds)
  useEffect(() => {
    if (!activeSession) return;

    let lastTaskSyncTime = Date.now();

    const syncInterval = setInterval(async () => {
      const current = activeSessionRef.current;
      if (!current) return;

      const now = Date.now();
      const delta = Math.max(0, now - current.lastStateChangeAt);
      const focMs = current.accumulatedFocusedMs + (current.currentState === 'focused' ? delta : 0);
      const disMs = current.accumulatedDistractedMs + (current.currentState === 'distracted' ? delta : 0);

      // Attribute focused time to active task
      if (current.currentState === 'focused' && activeTaskIdRef.current) {
        const elapsedSecSinceLastSync = Math.max(0, Math.round((now - lastTaskSyncTime) / 1000));
        if (elapsedSecSinceLastSync > 0) {
          const task = await db.tasks.get(activeTaskIdRef.current);
          if (task) {
            await db.tasks.update(activeTaskIdRef.current, {
              focusedSeconds: (task.focusedSeconds || 0) + elapsedSecSinceLastSync,
              updatedAt: now,
            });
          }
          lastTaskSyncTime = now;
        }
      } else {
        lastTaskSyncTime = now;
      }

      try {
        await db.deskSessions.put({
          id: current.id,
          dateKey: current.dateKey,
          startedAt: current.startedAt,
          endedAt: null,
          focusedSeconds: Math.floor(focMs / 1000),
          distractedSeconds: Math.floor(disMs / 1000),
          status: 'active',
          currentState: current.currentState,
          lastStateChangeAt: current.lastStateChangeAt,
          activeTaskId: activeTaskIdRef.current,
        });
      } catch (e) {
        console.error('Error background syncing desk session', e);
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [activeSession?.id]);

  // Clock In
  const clockIn = useCallback(async () => {
    const now = Date.now();
    const todayKey = getLocalDateKey();
    const sessionId = `desk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newSession: ActiveSessionState = {
      id: sessionId,
      dateKey: todayKey,
      startedAt: now,
      lastStateChangeAt: now,
      accumulatedFocusedMs: 0,
      accumulatedDistractedMs: 0,
      currentState: 'focused',
      activeTaskId: activeTaskIdRef.current,
    };

    setActiveSession(newSession);
    soundEngine.playRockerSwitch(true);

    try {
      await db.deskSessions.put({
        id: sessionId,
        dateKey: todayKey,
        startedAt: now,
        endedAt: null,
        focusedSeconds: 0,
        distractedSeconds: 0,
        status: 'active',
        currentState: 'focused',
        lastStateChangeAt: now,
        activeTaskId: activeTaskIdRef.current,
      });
    } catch (err) {
      console.error('Error starting desk session in DB', err);
    }
  }, []);

  // Toggle active state between FOCUSED and DISTRACTED
  const toggleState = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current) return;

    const now = Date.now();
    const delta = Math.max(0, now - current.lastStateChangeAt);

    let nextFoc = current.accumulatedFocusedMs;
    let nextDis = current.accumulatedDistractedMs;

    if (current.currentState === 'focused') {
      nextFoc += delta;
      // Also attribute to task
      if (activeTaskIdRef.current) {
        const addedSec = Math.round(delta / 1000);
        db.tasks.get(activeTaskIdRef.current).then(task => {
          if (task && addedSec > 0) {
            db.tasks.update(task.id, {
              focusedSeconds: (task.focusedSeconds || 0) + addedSec,
              updatedAt: now,
            });
          }
        });
      }
    } else {
      nextDis += delta;
    }

    const nextState: 'focused' | 'distracted' = current.currentState === 'focused' ? 'distracted' : 'focused';
    soundEngine.playRockerSwitch(nextState === 'focused');

    const updated: ActiveSessionState = {
      ...current,
      accumulatedFocusedMs: nextFoc,
      accumulatedDistractedMs: nextDis,
      currentState: nextState,
      lastStateChangeAt: now,
    };

    setActiveSession(updated);
  }, []);

  // Request Clock Out -> Opens Calibration Modal
  const requestClockOut = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current) return;

    const now = Date.now();
    const delta = Math.max(0, now - current.lastStateChangeAt);

    const focMs = current.accumulatedFocusedMs + (current.currentState === 'focused' ? delta : 0);
    const disMs = current.accumulatedDistractedMs + (current.currentState === 'distracted' ? delta : 0);
    const totalMs = focMs + disMs;

    setCalibrationData({
      sessionId: current.id,
      dateKey: current.dateKey,
      startedAt: current.startedAt,
      endedAt: now,
      initialFocusedMs: focMs,
      initialDistractedMs: disMs,
      totalMs,
    });

    setShowCalibrationModal(true);
    soundEngine.playKeyClick();
  }, []);

  // Commit Calibrated Session to DB
  const commitSession = useCallback(async (calibratedFocusedSec: number, calibratedDistractedSec: number) => {
    if (!calibrationData) return;

    try {
      const sessionRecord: DeskSession = {
        id: calibrationData.sessionId,
        dateKey: calibrationData.dateKey,
        startedAt: calibrationData.startedAt,
        endedAt: calibrationData.endedAt,
        focusedSeconds: calibratedFocusedSec,
        distractedSeconds: calibratedDistractedSec,
        status: 'completed',
        currentState: 'focused',
        lastStateChangeAt: calibrationData.endedAt,
        activeTaskId: activeTaskIdRef.current,
      };

      await db.deskSessions.put(sessionRecord);

      // Also update day record aggregated stats
      const existingDay = await db.days.get(calibrationData.dateKey);
      const allCompleted = await db.deskSessions
        .where('dateKey')
        .equals(calibrationData.dateKey)
        .and(s => s.status === 'completed')
        .toArray();

      const totalFoc = allCompleted.reduce((acc, s) => acc + s.focusedSeconds, 0);
      const totalDis = allCompleted.reduce((acc, s) => acc + s.distractedSeconds, 0);

      await db.days.put({
        dateKey: calibrationData.dateKey,
        sleepTime: existingDay?.sleepTime || '',
        wakeTime: existingDay?.wakeTime || '',
        sleepDurationMin: existingDay?.sleepDurationMin || 0,
        focusedSeconds: totalFoc,
        distractedSeconds: totalDis,
        updatedAt: Date.now(),
      });

      // Clear active state
      setActiveSession(null);
      localStorage.removeItem(STORAGE_KEY);
      setShowCalibrationModal(false);
      setCalibrationData(null);
      soundEngine.playKeyClick();

      refreshCompletedDayTotals(calibrationData.dateKey);
    } catch (err) {
      console.error('Error committing desk session', err);
    }
  }, [calibrationData, refreshCompletedDayTotals]);

  // Cancel Clock Out (resume active session)
  const cancelClockOut = useCallback(() => {
    setShowCalibrationModal(false);
    setCalibrationData(null);
    soundEngine.playKeyClick();
  }, []);

  // Reset Timer Back to 00:00:00 (Zero out session and today's desk time)
  const resetTimer = useCallback(async () => {
    soundEngine.playKeyClick();

    // Clear active session
    setActiveSession(null);
    localStorage.removeItem(STORAGE_KEY);
    setShowCalibrationModal(false);
    setCalibrationData(null);

    try {
      // Delete today's desk sessions
      await db.deskSessions
        .where('dateKey')
        .equals(selectedDateKey)
        .delete();

      // Zero out day's desk hours
      const existingDay = await db.days.get(selectedDateKey);
      if (existingDay) {
        await db.days.update(selectedDateKey, {
          focusedSeconds: 0,
          distractedSeconds: 0,
          updatedAt: Date.now(),
        });
      }

      // Zero out task focusedSeconds for today
      await db.tasks
        .where('dateKey')
        .equals(selectedDateKey)
        .modify({ focusedSeconds: 0, updatedAt: Date.now() });

      setCompletedTodayFocusedSec(0);
      setCompletedTodayDistractedSec(0);
    } catch (err) {
      console.error('Error resetting timer', err);
    }
  }, [selectedDateKey]);

  // Global Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        const tagName = target?.tagName?.toLowerCase();
        const isInputField = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

        if (isInputField) return;

        if (activeSessionRef.current && !showCalibrationModal) {
          e.preventDefault();
          toggleState();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleState, showCalibrationModal]);

  // Compute live current session values
  let currentSessionFocusedSec = 0;
  let currentSessionDistractedSec = 0;
  let currentSessionTotalSec = 0;

  if (activeSession) {
    const delta = Math.max(0, tick - activeSession.lastStateChangeAt);
    const liveFocMs = activeSession.accumulatedFocusedMs + (activeSession.currentState === 'focused' ? delta : 0);
    const liveDisMs = activeSession.accumulatedDistractedMs + (activeSession.currentState === 'distracted' ? delta : 0);

    currentSessionFocusedSec = Math.floor(liveFocMs / 1000);
    currentSessionDistractedSec = Math.floor(liveDisMs / 1000);
    currentSessionTotalSec = currentSessionFocusedSec + currentSessionDistractedSec;
  }

  const isSelectedDateToday = selectedDateKey === getLocalDateKey();
  const totalDayFocusedSec = completedTodayFocusedSec + (isSelectedDateToday ? currentSessionFocusedSec : 0);
  const totalDayDistractedSec = completedTodayDistractedSec + (isSelectedDateToday ? currentSessionDistractedSec : 0);
  const totalDayAtDeskSec = totalDayFocusedSec + totalDayDistractedSec;

  const deskEfficiencyPercent = totalDayAtDeskSec > 0
    ? Math.round((totalDayFocusedSec / totalDayAtDeskSec) * 100)
    : 0;

  return {
    activeSession,
    isClockedIn: activeSession !== null,
    currentState: activeSession?.currentState ?? 'focused',
    activeTaskId,
    setActiveTaskId,
    currentSessionFocusedSec,
    currentSessionDistractedSec,
    currentSessionTotalSec,
    totalDayFocusedSec,
    totalDayDistractedSec,
    totalDayAtDeskSec,
    deskEfficiencyPercent,
    clockIn,
    toggleState,
    requestClockOut,
    commitSession,
    cancelClockOut,
    resetTimer,
    showCalibrationModal,
    calibrationData,
    refreshTotals: () => refreshCompletedDayTotals(selectedDateKey),
  };
}

export type UseDeskTimerReturn = ReturnType<typeof useDeskTimer>;
