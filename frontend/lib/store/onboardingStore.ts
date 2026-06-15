import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  completed: boolean;
  run: boolean;
  start: () => void;
  stop: () => void;
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      run: false,
      start: () => set({ run: true }),
      stop: () => set({ run: false }),
      complete: () => set({ run: false, completed: true }),
    }),
    { name: "onboarding" }
  )
);
