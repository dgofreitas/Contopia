// Contopia — Error Store Tests (STORY-008)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useErrorStore } from '../stores/error-store';

describe('error-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useErrorStore.setState({ toasts: [], isOffline: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── addToast ──

  describe('addToast', () => {
    it('adds a toast with id, code, message, and timestamp', () => {
      useErrorStore.getState().addToast('TEST_ERROR', 'Test message');

      const toasts = useErrorStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].code).toBe('TEST_ERROR');
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0]).toHaveProperty('id');
      expect(toasts[0]).toHaveProperty('timestamp');
    });

    it('adds toast with null message', () => {
      useErrorStore.getState().addToast('NO_MSG', null);

      const toasts = useErrorStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].code).toBe('NO_MSG');
      expect(toasts[0].message).toBeNull();
    });

    it('debounces same error code within 500ms window', () => {
      const store = useErrorStore.getState();
      store.addToast('DUPLICATE', 'First call');
      store.addToast('DUPLICATE', 'Second call');

      expect(useErrorStore.getState().toasts).toHaveLength(1);
      expect(useErrorStore.getState().toasts[0].message).toBe('First call');
    });

    it('allows different error codes within 500ms', () => {
      const store = useErrorStore.getState();
      store.addToast('ERR_A', 'Alpha');
      store.addToast('ERR_B', 'Beta');

      expect(useErrorStore.getState().toasts).toHaveLength(2);
    });

    it('allows same code after 500ms debounce window expires', () => {
      useErrorStore.getState().addToast('TIMED', 'First');
      vi.advanceTimersByTime(501);

      useErrorStore.getState().addToast('TIMED', 'Second');

      expect(useErrorStore.getState().toasts).toHaveLength(2);
    });

    it('respects max 3 toasts limit via slice(-2) plus new', () => {
      const store = useErrorStore.getState();
      store.addToast('ERR_1', 'One');
      store.addToast('ERR_2', 'Two');
      store.addToast('ERR_3', 'Three');
      store.addToast('ERR_4', 'Four');

      const toasts = useErrorStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts.map((t) => t.code)).toEqual(['ERR_2', 'ERR_3', 'ERR_4']);
    });

    it('auto-dismisses toast after 5 seconds', () => {
      useErrorStore.getState().addToast('AUTO', 'Will disappear');

      expect(useErrorStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(useErrorStore.getState().toasts).toHaveLength(0);
    });

    it('only removes the specific toast whose timeout fires', () => {
      useErrorStore.getState().addToast('FIRST', 'First');
      vi.advanceTimersByTime(1000);
      useErrorStore.getState().addToast('SECOND', 'Second');
      vi.advanceTimersByTime(4000);

      // FIRST's 5s timeout fired, SECOND hasn't
      let toasts = useErrorStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].code).toBe('SECOND');

      vi.advanceTimersByTime(1000);
      expect(useErrorStore.getState().toasts).toHaveLength(0);
    });

    it('generates unique ids for each toast', () => {
      useErrorStore.getState().addToast('A', null);
      useErrorStore.getState().addToast('B', null);
      useErrorStore.getState().addToast('C', null);

      const ids = useErrorStore.getState().toasts.map((t) => t.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  // ── removeToast ──

  describe('removeToast', () => {
    it('removes a toast by its id', () => {
      useErrorStore.getState().addToast('REMOVABLE', 'Remove me');
      const toast = useErrorStore.getState().toasts[0];

      useErrorStore.getState().removeToast(toast.id);

      expect(useErrorStore.getState().toasts).toHaveLength(0);
    });

    it('does nothing when given a non-existent id', () => {
      useErrorStore.getState().addToast('KEEP', 'Keep me');

      useErrorStore.getState().removeToast('non-existent-id');

      expect(useErrorStore.getState().toasts).toHaveLength(1);
    });

    it('removes only the specified toast from multiple', () => {
      useErrorStore.getState().addToast('KEEP', 'Keep me');
      useErrorStore.getState().addToast('REMOVE', 'Remove me');

      const toasts = useErrorStore.getState().toasts;
      const toRemove = toasts.find((t) => t.code === 'REMOVE');

      useErrorStore.getState().removeToast(toRemove.id);

      expect(useErrorStore.getState().toasts).toHaveLength(1);
      expect(useErrorStore.getState().toasts[0].code).toBe('KEEP');
    });

    it('is safe to call on empty toasts array', () => {
      expect(useErrorStore.getState().toasts).toHaveLength(0);

      useErrorStore.getState().removeToast('any-id');

      expect(useErrorStore.getState().toasts).toHaveLength(0);
    });
  });

  // ── setOffline ──

  describe('setOffline', () => {
    it('sets isOffline to true', () => {
      useErrorStore.getState().setOffline(true);
      expect(useErrorStore.getState().isOffline).toBe(true);
    });

    it('sets isOffline to false', () => {
      useErrorStore.getState().setOffline(true);
      useErrorStore.getState().setOffline(false);
      expect(useErrorStore.getState().isOffline).toBe(false);
    });

    it('adds BACK_ONLINE toast when transitioning from offline to online', () => {
      useErrorStore.getState().setOffline(true);
      useErrorStore.getState().setOffline(false);

      const toasts = useErrorStore.getState().toasts;
      expect(toasts.some((t) => t.code === 'BACK_ONLINE')).toBe(true);
    });

    it('does not add BACK_ONLINE when staying online', () => {
      useErrorStore.getState().setOffline(false);
      expect(useErrorStore.getState().toasts).toHaveLength(0);
    });

    it('does not add BACK_ONLINE on initial offline transition', () => {
      useErrorStore.getState().setOffline(true);
      expect(
        useErrorStore.getState().toasts.filter((t) => t.code === 'BACK_ONLINE')
      ).toHaveLength(0);
    });

    it('does not add BACK_ONLINE when going offline twice', () => {
      useErrorStore.getState().setOffline(true);
      useErrorStore.getState().setOffline(true);
      expect(
        useErrorStore.getState().toasts.filter((t) => t.code === 'BACK_ONLINE')
      ).toHaveLength(0);
    });
  });

  // ── clearAll ──

  describe('clearAll', () => {
    it('clears all toasts', () => {
      useErrorStore.getState().addToast('A', null);
      useErrorStore.getState().addToast('B', null);
      useErrorStore.getState().clearAll();

      expect(useErrorStore.getState().toasts).toEqual([]);
    });

    it('does not affect isOffline state', () => {
      useErrorStore.getState().setOffline(true);
      useErrorStore.getState().addToast('ERR', 'Msg');
      useErrorStore.getState().clearAll();

      expect(useErrorStore.getState().isOffline).toBe(true);
    });

    it('is safe to call when toasts is already empty', () => {
      useErrorStore.getState().clearAll();
      expect(useErrorStore.getState().toasts).toEqual([]);
    });
  });
});
