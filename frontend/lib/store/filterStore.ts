import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FilterState {
  search: string;
  city: string;
  contractType: string;
  source: string;
  minScore: number;
  set: (patch: Partial<Omit<FilterState, "set" | "reset">>) => void;
  reset: () => void;
}

const DEFAULTS = { search: "", city: "", contractType: "All", source: "all", minScore: 0 };

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: "job-filters" }
  )
);
