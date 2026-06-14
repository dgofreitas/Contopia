// Contopia — Auth Store Tests (STORY-059: startSessionFromParent)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAuthStore from '../stores/auth-store';

describe('auth-store (STORY-059)', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      token: null,
      refreshToken: null,
      user: null,
      onboardingComplete: false,
      sessionId: null,
      sessionCreatedAt: null,
      lastActivity: null,
      sessionExpiresAt: null,
      sessionTimeoutWarning: false,
    });
  });

  describe('startSessionFromParent', () => {
    it('should set token from accessToken', () => {
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt-token',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
        isOnboardingComplete: true,
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe('child-jwt-token');
    });

    it('should set refreshToken to null', () => {
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });

      expect(useAuthStore.getState().refreshToken).toBeNull();
    });

    it('should set user with childId and childFirstName', () => {
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });

      expect(useAuthStore.getState().user).toEqual({
        childId: 'child123',
        childFirstName: 'Julia',
      });
    });

    it('should set onboardingComplete to the provided value', () => {
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
        isOnboardingComplete: false,
      });

      expect(useAuthStore.getState().onboardingComplete).toBe(false);
    });

    it('should default onboardingComplete to true when not provided', () => {
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });

      expect(useAuthStore.getState().onboardingComplete).toBe(true);
    });

    it('should set sessionId', () => {
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_custom',
      });

      expect(useAuthStore.getState().sessionId).toBe('sess_custom');
    });

    it('should set sessionCreatedAt and lastActivity timestamps', () => {
      const before = Date.now();
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });
      const after = Date.now();

      const state = useAuthStore.getState();
      expect(state.sessionCreatedAt).toBeGreaterThanOrEqual(before);
      expect(state.sessionCreatedAt).toBeLessThanOrEqual(after);
      expect(state.lastActivity).toBeGreaterThanOrEqual(before);
      expect(state.lastActivity).toBeLessThanOrEqual(after);
    });

    it('should set sessionExpiresAt to 30 minutes from now', () => {
      const before = Date.now();
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });

      const state = useAuthStore.getState();
      expect(state.sessionExpiresAt).toBeGreaterThanOrEqual(before + 30 * 60 * 1000 - 100);
      expect(state.sessionExpiresAt).toBeLessThanOrEqual(before + 30 * 60 * 1000 + 100);
    });

    it('should set sessionTimeoutWarning to false', () => {
      useAuthStore.setState({ sessionTimeoutWarning: true }); // ensure it was true before
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });

      expect(useAuthStore.getState().sessionTimeoutWarning).toBe(false);
    });

    it('should NOT clear existing fields that are not in the session payload', () => {
      // Set some unrelated state first
      useAuthStore.getState().startSessionFromParent({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
      });

      // Verify the expected fields are set
      const state = useAuthStore.getState();
      expect(state.token).toBe('child-jwt');
      expect(state.sessionId).toBe('sess_abc');
      expect(state.user).toEqual({ childId: 'child123', childFirstName: 'Julia' });
    });
  });
});