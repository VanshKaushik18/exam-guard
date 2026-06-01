import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

/**
 * useBehavioralTracker
 * Tracks user behavior during an exam without camera access.
 * Detects: tab switches, copy/paste, right-click, keyboard shortcuts,
 * window blur/focus, idle periods, dev tools attempts, fullscreen exits.
 */
export const useBehavioralTracker = (sessionId, enabled = true) => {
  const idleTimer = useRef(null);
  const lastActivity = useRef(Date.now());
  const IDLE_THRESHOLD = 60000; // 60 seconds

  const logEvent = useCallback(async (type, metadata = {}, severity = 'low') => {
    if (!sessionId || !enabled) return;
    try {
      await axios.post(`/api/sessions/${sessionId}/event`, { type, metadata, severity });
    } catch (err) {
      console.warn('Failed to log event:', err.message);
    }
  }, [sessionId, enabled]);

  const resetIdle = useCallback(() => {
    lastActivity.current = Date.now();
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      logEvent('idle_detected', { idleMs: IDLE_THRESHOLD }, 'medium');
    }, IDLE_THRESHOLD);
  }, [logEvent]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    // --- Tab / Visibility switch ---
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('tab_switch', { hidden: true }, 'high');
      }
    };

    // --- Window blur/focus ---
    const handleBlur = () => logEvent('window_blur', {}, 'medium');
    const handleFocus = () => logEvent('window_focus', {}, 'low');

    // --- Copy/Paste detection ---
    const handleCopy = (e) => {
      const selected = window.getSelection()?.toString();
      logEvent('copy_attempt', { textLength: selected?.length || 0 }, 'high');
    };
    const handlePaste = (e) => {
      logEvent('paste_attempt', { hasData: !!e.clipboardData }, 'high');
      e.preventDefault(); // block paste in exam
    };
    const handleCut = () => logEvent('copy_attempt', { cut: true }, 'high');

    // --- Right click ---
    const handleContextMenu = (e) => {
      e.preventDefault();
      logEvent('right_click', {}, 'low');
    };

    // --- Keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+Tab, F12, etc.) ---
    const handleKeyDown = (e) => {
      resetIdle();
      const ctrl = e.ctrlKey || e.metaKey;

      // Dev tools
      if (e.key === 'F12' || (ctrl && e.shiftKey && e.key === 'I') || (ctrl && e.shiftKey && e.key === 'J')) {
        e.preventDefault();
        logEvent('dev_tools_attempt', { key: e.key }, 'high');
        return;
      }

      // Suspicious shortcuts
      const suspiciousKeys = ['c', 'v', 'x', 'a', 'u', 's', 'p'];
      if (ctrl && suspiciousKeys.includes(e.key.toLowerCase())) {
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault(); // block paste
          logEvent('paste_attempt', { key: e.key }, 'high');
        } else {
          logEvent('keyboard_shortcut', { key: `Ctrl+${e.key.toUpperCase()}` }, 'medium');
        }
      }

      // Print screen
      if (e.key === 'PrintScreen') {
        logEvent('keyboard_shortcut', { key: 'PrintScreen' }, 'high');
      }
    };

    // --- Mouse activity for idle detection ---
    const handleMouseMove = () => resetIdle();

    // --- Dev tools: window size heuristic ---
    const detectDevTools = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        logEvent('dev_tools_attempt', { method: 'size_heuristic' }, 'high');
      }
    };
    const devToolsInterval = setInterval(detectDevTools, 3000);

    // --- Fullscreen exit ---
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logEvent('fullscreen_exit', {}, 'medium');
      }
    };

    // Register all listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Start idle detection
    resetIdle();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(devToolsInterval);
      clearTimeout(idleTimer.current);
    };
  }, [sessionId, enabled, logEvent, resetIdle]);

  // Request fullscreen on start
  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  return { requestFullscreen, logEvent };
};
