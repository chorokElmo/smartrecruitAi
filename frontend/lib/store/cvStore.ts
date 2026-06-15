import { create } from "zustand";
import { cvApi } from "@/lib/api/cv";

interface CvState {
  hasCv: boolean | null;            // null = not yet checked
  hasRecommendations: boolean;
  checking: boolean;
  refresh: () => Promise<void>;
  setHasCv: (v: boolean) => void;
  setHasRecommendations: (v: boolean) => void;
}

export const useCvStore = create<CvState>((set) => ({
  hasCv: null,
  hasRecommendations: false,
  checking: false,
  refresh: async () => {
    set({ checking: true });
    try {
      await cvApi.getLatest();
      set({ hasCv: true });
    } catch {
      set({ hasCv: false });
    } finally {
      set({ checking: false });
    }
  },
  setHasCv: (v) => set({ hasCv: v }),
  setHasRecommendations: (v) => set({ hasRecommendations: v }),
}));
