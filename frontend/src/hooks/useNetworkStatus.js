import { useState, useEffect, useRef, useCallback } from 'react';

const HEARTBEAT_URL = '/api/v1/health';
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 5000;

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [isRealOnline, setIsRealOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const heartbeatIntervalRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const clearHeartbeatTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const checkHeartbeat = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsRealOnline(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

      const response = await fetch(HEARTBEAT_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!isUnmountedRef.current) {
        if (response.ok) {
          setIsRealOnline(true);
        } else {
          setIsRealOnline(false);
        }
      }
    } catch {
      if (!isUnmountedRef.current) {
        setIsRealOnline(false);
      }
    }
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      checkHeartbeat();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsRealOnline(false);
      setWasOffline(false);
      clearHeartbeatTimers();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkHeartbeat();

    heartbeatIntervalRef.current = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        checkHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearHeartbeatTimers();
    };
  }, [checkHeartbeat, clearHeartbeatTimers]);

  return { isOnline, wasOffline, isRealOnline };
}