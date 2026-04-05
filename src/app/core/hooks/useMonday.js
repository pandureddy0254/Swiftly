import { useState, useEffect, useCallback } from 'react';

const SDK_TIMEOUT_MS = 3000;

/**
 * Detect if we're running inside a monday.com iframe.
 */
function isInsideMonday() {
  try {
    return window.self !== window.top;
  } catch {
    return true; // Cross-origin restriction means we're in an iframe
  }
}

/**
 * Hook to initialize the monday.com SDK and get context.
 * Falls back to standalone mode when not inside Monday.com iframe.
 */
export function useMonday() {
  const [context, setContext] = useState(null);
  const [settings, setSettings] = useState({});
  const [token, setToken] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If not inside Monday.com iframe, go straight to standalone mode
    if (!isInsideMonday()) {
      console.log('[Swiftly] Standalone mode — not inside Monday.com iframe');
      setToken('standalone');
      setContext({ boardId: null, theme: 'light' });
      setIsReady(true);
      return;
    }

    let timeoutId;

    async function init() {
      try {
        const mondaySdk = (await import('monday-sdk-js')).default;
        const monday = mondaySdk();

        // Race: SDK init vs timeout
        const tokenPromise = monday.get('sessionToken');
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('SDK timeout')), SDK_TIMEOUT_MS);
        });

        const tokenResult = await Promise.race([tokenPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        setToken(tokenResult.data);

        // Get context
        monday.listen('context', (res) => {
          setContext(res.data);
          setIsReady(true);
        });

        monday.listen('settings', (res) => {
          setSettings(res.data);
        });

        window.__mondayInstance = monday;
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('[Swiftly] SDK init failed, using standalone mode:', err.message);

        // Fallback to standalone mode
        setToken('standalone');
        setContext({ boardId: null, theme: 'light' });
        setIsReady(true);
      }
    }

    init();

    return () => clearTimeout(timeoutId);
  }, []);

  const showNotification = useCallback((message, type = 'info') => {
    if (window.__mondayInstance) {
      window.__mondayInstance.execute('notice', {
        message,
        type,
        timeout: 5000,
      });
    }
  }, []);

  return {
    context,
    settings,
    token,
    isReady,
    error,
    boardId: context?.boardId || null,
    theme: context?.theme || 'light',
    isStandalone: token === 'standalone',
    showNotification,
  };
}

export default useMonday;
