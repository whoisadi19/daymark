import { useEffect, useCallback } from 'react';
import { db, getLocalDateKey, TaskItem } from '../db/db';
import { soundEngine } from '../utils/audio';

const ROLLOVER_STORAGE_PREFIX = 'daymark_rollover_done_';

export function useDailyRollover(todayDateKey = getLocalDateKey()) {
  // Execute auto-rollover when viewing today
  const performRollover = useCallback(async () => {
    const rolloverFlagKey = `${ROLLOVER_STORAGE_PREFIX}${todayDateKey}`;
    const alreadyRun = localStorage.getItem(rolloverFlagKey);

    // If today already processed in this browser session, skip
    if (alreadyRun) return;

    try {
      // Find all distinct previous task dateKeys
      const allTasks = await db.tasks.toArray();
      const previousDates = Array.from(new Set(allTasks.map(t => t.dateKey)))
        .filter(d => d < todayDateKey)
        .sort();

      if (previousDates.length === 0) {
        // No previous days, mark done
        localStorage.setItem(rolloverFlagKey, 'true');
        return;
      }

      // Most recent previous date
      const mostRecentPrevDate = previousDates[previousDates.length - 1];

      // Query previous day's tomorrow items & uncompleted today items
      const prevTomorrowTasks = await db.tasks
        .where('dateKey')
        .equals(mostRecentPrevDate)
        .and(t => t.listType === 'tomorrow')
        .toArray();

      const prevUncompletedTodayTasks = await db.tasks
        .where('dateKey')
        .equals(mostRecentPrevDate)
        .and(t => t.listType === 'today' && !t.completed)
        .toArray();

      // Check what tasks already exist for today
      const todayExistingTasks = await db.tasks
        .where('dateKey')
        .equals(todayDateKey)
        .toArray();

      const existingTitles = new Set(todayExistingTasks.map(t => t.title.trim().toLowerCase()));

      const newPromotedTasks: TaskItem[] = [];

      // 1. Promote "What I will do tomorrow" items into Today's checklist
      for (const item of prevTomorrowTasks) {
        if (!existingTitles.has(item.title.trim().toLowerCase())) {
          newPromotedTasks.push({
            id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            dateKey: todayDateKey,
            listType: 'today',
            title: item.title,
            completed: false,
            completedAt: null,
            rolloverCount: item.rolloverCount || 0,
            linkedToGoal: item.linkedToGoal || false,
            updatedAt: Date.now(),
          });
          existingTitles.add(item.title.trim().toLowerCase());
        }
      }

      // 2. Promote uncompleted tasks from yesterday with incremented rolloverCount
      for (const item of prevUncompletedTodayTasks) {
        if (!existingTitles.has(item.title.trim().toLowerCase())) {
          newPromotedTasks.push({
            id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            dateKey: todayDateKey,
            listType: 'today',
            title: item.title,
            completed: false,
            completedAt: null,
            rolloverCount: (item.rolloverCount || 0) + 1,
            linkedToGoal: item.linkedToGoal || false,
            updatedAt: Date.now(),
          });
          existingTitles.add(item.title.trim().toLowerCase());
        }
      }

      if (newPromotedTasks.length > 0) {
        await db.tasks.bulkPut(newPromotedTasks);
      }

      localStorage.setItem(rolloverFlagKey, 'true');
    } catch (err) {
      console.error('Error during auto-rollover execution:', err);
    }
  }, [todayDateKey]);

  useEffect(() => {
    performRollover();
  }, [performRollover]);

  // Add task to Today
  const addTodayTask = useCallback(async (title: string, linkedToGoal = false) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dateKey: todayDateKey,
      listType: 'today',
      title: trimmed,
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal,
      updatedAt: Date.now(),
    };

    await db.tasks.put(newTask);
    soundEngine.playKeyClick();
  }, [todayDateKey]);

  // Add task to Tomorrow (Strictly max 5 slots)
  const addTomorrowTask = useCallback(async (title: string, linkedToGoal = false): Promise<boolean> => {
    const trimmed = title.trim();
    if (!trimmed) return false;

    // Check count for tomorrow
    const currentCount = await db.tasks
      .where('dateKey')
      .equals(todayDateKey)
      .and(t => t.listType === 'tomorrow')
      .count();

    if (currentCount >= 5) {
      return false; // Capped at 5
    }

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dateKey: todayDateKey,
      listType: 'tomorrow',
      title: trimmed,
      completed: false,
      completedAt: null,
      rolloverCount: 0,
      linkedToGoal,
      updatedAt: Date.now(),
    };

    await db.tasks.put(newTask);
    soundEngine.playKeyClick();
    return true;
  }, [todayDateKey]);

  // Toggle Checkbox: stamps with completion time [DONE 14:22]
  const toggleTask = useCallback(async (id: string) => {
    const task = await db.tasks.get(id);
    if (!task) return;

    const nextCompleted = !task.completed;
    let completedAt: string | null = null;

    if (nextCompleted) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      completedAt = `${hh}:${mm}`;
    }

    await db.tasks.update(id, {
      completed: nextCompleted,
      completedAt,
      updatedAt: Date.now(),
    });

    soundEngine.playCheckboxClick(nextCompleted);
  }, []);

  // Delete task
  const deleteTask = useCallback(async (id: string) => {
    await db.tasks.delete(id);
    soundEngine.playKeyClick();
  }, []);

  // Toggle Goal Link
  const toggleGoalLink = useCallback(async (id: string) => {
    const task = await db.tasks.get(id);
    if (!task) return;

    await db.tasks.update(id, {
      linkedToGoal: !task.linkedToGoal,
      updatedAt: Date.now(),
    });

    soundEngine.playKeyClick();
  }, []);

  return {
    addTodayTask,
    addTomorrowTask,
    toggleTask,
    deleteTask,
    toggleGoalLink,
    triggerManualRollover: performRollover,
  };
}

