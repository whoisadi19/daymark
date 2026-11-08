import { useState, useEffect, useCallback, useRef } from 'react';
import { db, getLocalDateKey, DeskSession } from '../db/db';
import { soundEngine } from '../utils/audio';

const STORAGE_KEY = 'daymark_active_desk_session_v1';

export interface ActiveSessionState {
  id: string;
  dateKey: string;
  startedAt: number;
  lastStateChangeAt: number;
  accumulatedFocusedMs: number;
  accumulatedDistractedMs: number;
  currentState: 'focused' | 'distracted';
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

  const [tick, setTick] = useState<number>(Date.now());
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);

  // Totals for completed sessions on the selected date
  const [completedTodayFocusedSec, setCompletedTodayFocusedSec] = useState<number>(0);
  const [completedTodayDistractedSec, setCompletedTodayDistractedSec] = useState<number>(0);

  // Ref to hold activeSession for spacebar listener without re-binding listener
  const activeSessionRef = useRef<ActiveSessionState | null>(activeSession);
  activeSessionRef.current = activeSession;

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

  // Periodic persistence of active session to Dexie (every 5 seconds)
  useEffect(() => {
    if (!activeSession) return;

    const syncInterval = setInterval(async () => {
      const current = activeSessionRef.current;
      if (!current) return;

      const now = Date.now();
      const delta = Math.max(0, now - current.lastStateChangeAt);
      const focMs = current.accumulatedFocusedMs + (current.currentState === 'focused' ? delta : 0);
      const disMs = current.accumulatedDistractedMs + (current.currentState === 'distracted' ? delta : 0);

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
        });
      } catch (e) {
        console.error('Error background syncing desk session', e);
      }
    }, 5000);

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
      };

      await db.deskSessions.put(sessionRecord);

      // Also update or insert day record aggregated stats
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

      // Refresh totals
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

  // Global Spacebar shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        const tagName = target?.tagName?.toLowerCase();
        const isInputField = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

        if (isInputField) {
          // Allow normal spacebar typing in input fields
          return;
        }

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

  // Combined totals for selected date
  const isSelectedDateToday = selectedDateKey === getLocalDateKey();
  const totalDayFocusedSec = completedTodayFocusedSec + (isSelectedDateToday ? currentSessionFocusedSec : 0);
  const totalDayDistractedSec = completedTodayDistractedSec + (isSelectedDateToday ? currentSessionDistractedSec : 0);
  const totalDayAtDeskSec = totalDayFocusedSec + totalDayDistractedSec;

  // Live Desk Efficiency: (Focused / Time at Desk) * 100
  const deskEfficiencyPercent = totalDayAtDeskSec > 0
    ? Math.round((totalDayFocusedSec / totalDayAtDeskSec) * 100)
    : 0;

  return {
    activeSession,
    isClockedIn: activeSession !== null,
    currentState: activeSession?.currentState ?? 'focused',
    // Live session stats
    currentSessionFocusedSec,
    currentSessionDistractedSec,
    currentSessionTotalSec,
    // Day combined stats
    totalDayFocusedSec,
    totalDayDistractedSec,
    totalDayAtDeskSec,
    deskEfficiencyPercent,
    // Actions
    clockIn,
    toggleState,
    requestClockOut,
    commitSession,
    cancelClockOut,
    // Calibration Modal
    showCalibrationModal,
    calibrationData,
    refreshTotals: () => refreshCompletedDayTotals(selectedDateKey),
  };
}

