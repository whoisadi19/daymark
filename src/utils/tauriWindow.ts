import React from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

/**
 * Returns true if running inside the Tauri native desktop wrapper.
 */
export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
};

/**
 * Resizes the native desktop OS window based on the application mode:
 * - Widget Mode: 380x460 LogicalSize + AlwaysOnTop(true)
 * - Full Mode: 900x640 LogicalSize + AlwaysOnTop(false)
 */
export async function resizeNativeWindowForMode(isWidget: boolean): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    const appWindow = getCurrentWindow();
    if (isWidget) {
      await appWindow.setSize(new LogicalSize(380, 460));
      await appWindow.setAlwaysOnTop(true);
    } else {
      await appWindow.setSize(new LogicalSize(900, 640));
      await appWindow.setAlwaysOnTop(false);
      await appWindow.center();
    }
  } catch (err) {
    console.warn('[Tauri] Failed to resize native window:', err);
  }
}

/**
 * Minimizes the native OS window.
 */
export async function minimizeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  } catch (err) {
    console.warn('[Tauri] Failed to minimize window:', err);
  }
}

/**
 * Toggles maximize / restore of the native OS window.
 */
export async function toggleMaximizeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  } catch (err) {
    console.warn('[Tauri] Failed to toggle maximize window:', err);
  }
}

/**
 * Hides the native OS window to the system tray, keeping background timers running.
 */
export async function closeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  } catch (err) {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch {
      console.warn('[Tauri] Failed to hide/close window:', err);
    }
  }
}

/**
 * Starts window dragging on Linux/macOS/Windows when clicking the top bar,
 * ignoring clicks on interactive elements like buttons and inputs.
 */
export async function handleWindowDrag(e: React.MouseEvent): Promise<void> {
  if (!isTauri()) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;

  if (
    target.closest('button') ||
    target.closest('input') ||
    target.closest('textarea') ||
    target.closest('a') ||
    target.closest('[role="button"]') ||
    target.isContentEditable
  ) {
    return;
  }

  try {
    const appWindow = getCurrentWindow();
    await appWindow.startDragging();
  } catch (err) {
    console.warn('[Tauri] startDragging failed:', err);
  }
}
