// Contopia — Auth Store (Zustand)
// NO PERSIST MIDDLEWARE — COPPA compliance requires memory-only storage
import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: null,
  user: null,
  onboardingComplete: false,

  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),

  logout: () => set({ token: null, user: null, onboardingComplete: false }),
}));

export default useAuthStore;