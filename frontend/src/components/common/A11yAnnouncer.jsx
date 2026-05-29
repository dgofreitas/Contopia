import { useState, useEffect, useRef } from 'react';

/**
 * A11yAnnouncer — polite live region for screen reader announcements.
 *
 * Supports message queuing: if a new message arrives while the previous
 * one is still being announced, it queues and fires after a brief delay
 * so screen readers don't swallow rapid consecutive updates.
 */
export default function A11yAnnouncer({ message }) {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;

    // If no message currently displayed, show immediately
    if (!displayedMessage) {
      setDisplayedMessage(message);
    } else {
      // Queue the message for sequential announcement
      queueRef.current.push(message);
    }
  }, [message]);

  // Process queued messages after current one is displayed
  useEffect(() => {
    if (!displayedMessage) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    // Allow 250ms for screen readers to announce before showing next
    timerRef.current = setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift();
        setDisplayedMessage(next);
      } else {
        // Clear after announcement to allow re-announcing the same message
        setDisplayedMessage('');
      }
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [displayedMessage]);

  return (
    <span aria-live="polite" role="status" className="sr-only" aria-atomic="true">
      {displayedMessage}
    </span>
  );
}