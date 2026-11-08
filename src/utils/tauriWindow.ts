import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

/**
 * Returns true if running inside the Tauri native desktop wrapper.
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
};

/**
 * Resizes the native desktop OS window based on the application mode:
 * - Widget Mode: 380x440 LogicalSize + AlwaysOnTop(true)
 * - Full Mode: 960x680 LogicalSize + AlwaysOnTop(false)
 */
export async function resizeNativeWindowForMode(isWidget: boolean): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    const appWindow = getCurrentWindow();
    if (isWidget) {
      await appWindow.setSize(new LogicalSize(380, 440));
      await appWindow.setAlwaysOnTop(true);
    } else {
      await appWindow.setSize(new LogicalSize(960, 680));
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
 * Closes the native OS window.
 */
export async function closeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  } catch (err) {
    console.warn('[Tauri] Failed to close window:', err);
  }
}

