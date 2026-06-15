import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RegisterState {
  step: number;
  fileName: string;
  name: string;
  email: string;
  domain: string;
  diploma: string;
  years_experience: string;
  skills: string[];
  set: (patch: Partial<Omit<RegisterState, "set" | "reset">>) => void;
  reset: () => void;
}

const DEFAULTS = {
  step: 1, fileName: "", name: "", email: "",
  domain: "", diploma: "", years_experience: "", skills: [] as string[],
};

export const useRegisterStore = create<RegisterState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: "register-flow" }
  )
);
