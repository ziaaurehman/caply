import { create } from "zustand";

export type WeekKey = string; // ISO string for week start date

export interface WeekDailyState {
  dailyHours: number[]; // length 7, SUN..SAT
  linked: boolean; // if true, editing one day updates all
  includeWeekends: boolean; // if true, weekend days are editable/non-zero
}

export interface CapacityStoreState {
  // key: `${memberId}:${projectId}:${weekKey}`
  weekMap: Record<string, WeekDailyState>;

  getKey: (memberId: string, projectId: string, weekKey: WeekKey) => string;
  getOrInit: (
    memberId: string,
    projectId: string,
    weekKey: WeekKey,
    defaultWeekdayHours: number,
    includeWeekends?: boolean
  ) => WeekDailyState;
  getWeekState: (
    memberId: string,
    projectId: string,
    weekKey: WeekKey
  ) => WeekDailyState | undefined;

  setLinked: (
    memberId: string,
    projectId: string,
    weekKey: WeekKey,
    linked: boolean
  ) => void;

  setIncludeWeekends: (
    memberId: string,
    projectId: string,
    weekKey: WeekKey,
    include: boolean
  ) => void;

  setDayHours: (
    memberId: string,
    projectId: string,
    weekKey: WeekKey,
    dayIndex: number,
    value: number
  ) => void;

  setWeekTotal: (
    memberId: string,
    projectId: string,
    weekKey: WeekKey,
    weekTotal: number
  ) => void;

  removeProjectAllWeeks: (memberId: string, projectId: string) => void;
}

export const useCapacityStore = create<CapacityStoreState>((set, get) => ({
  weekMap: {},

  getKey: (memberId, projectId, weekKey) =>
    `${memberId}:${projectId}:${weekKey}`,

  getOrInit: (
    memberId,
    projectId,
    weekKey,
    defaultWeekdayHours,
    includeWeekends = false
  ) => {
    const key = get().getKey(memberId, projectId, weekKey);
    const existing = get().weekMap[key];
    if (existing) return existing;

    const dailyHours = [
      includeWeekends ? defaultWeekdayHours : 0,
      defaultWeekdayHours,
      defaultWeekdayHours,
      defaultWeekdayHours,
      defaultWeekdayHours,
      defaultWeekdayHours,
      includeWeekends ? defaultWeekdayHours : 0,
    ];

    const initial: WeekDailyState = {
      dailyHours,
      linked: true,
      includeWeekends,
    };
    set((state) => ({ weekMap: { ...state.weekMap, [key]: initial } }));
    return initial;
  },

  getWeekState: (memberId, projectId, weekKey) => {
    const key = get().getKey(memberId, projectId, weekKey);
    return get().weekMap[key];
  },

  setLinked: (memberId, projectId, weekKey, linked) => {
    const key = get().getKey(memberId, projectId, weekKey);
    const curr = get().weekMap[key];
    if (!curr) return;
    set((state) => ({
      weekMap: { ...state.weekMap, [key]: { ...curr, linked } },
    }));
  },

  setIncludeWeekends: (memberId, projectId, weekKey, include) => {
    const key = get().getKey(memberId, projectId, weekKey);
    const curr = get().weekMap[key];
    if (!curr) return;
    // When toggling weekends, zero out weekends if disabling
    let nextDaily = curr.dailyHours.slice();
    if (!include) {
      nextDaily[0] = 0;
      nextDaily[6] = 0;
    }
    set((state) => ({
      weekMap: {
        ...state.weekMap,
        [key]: { ...curr, includeWeekends: include, dailyHours: nextDaily },
      },
    }));
  },

  setDayHours: (memberId, projectId, weekKey, dayIndex, value) => {
    const key = get().getKey(memberId, projectId, weekKey);
    const curr = get().weekMap[key];
    if (!curr) return;
    const sanitized = Math.max(0, Number.isFinite(value) ? value : 0);
    let nextDaily = curr.dailyHours.slice();
    if (curr.linked) {
      for (let i = 0; i < 7; i++) {
        if (!curr.includeWeekends && (i === 0 || i === 6)) {
          nextDaily[i] = 0;
        } else {
          nextDaily[i] = sanitized;
        }
      }
    } else {
      if (!curr.includeWeekends && (dayIndex === 0 || dayIndex === 6)) {
        nextDaily[dayIndex] = 0;
      } else {
        nextDaily[dayIndex] = sanitized;
      }
    }
    set((state) => ({
      weekMap: { ...state.weekMap, [key]: { ...curr, dailyHours: nextDaily } },
    }));
  },

  setWeekTotal: (memberId, projectId, weekKey, weekTotal) => {
    const key = get().getKey(memberId, projectId, weekKey);
    const curr = get().weekMap[key];
    if (!curr) return;
    const days = curr.includeWeekends ? 7 : 5; // SUN..SAT with weekends included or Mon-Fri
    const perDay = days > 0 ? weekTotal / days : 0;
    const nextDaily = curr.dailyHours.slice();
    for (let i = 0; i < 7; i++) {
      const isWeekend = i === 0 || i === 6;
      if (!curr.includeWeekends && isWeekend) {
        nextDaily[i] = 0;
      } else {
        nextDaily[i] = perDay;
      }
    }
    set((state) => ({
      weekMap: { ...state.weekMap, [key]: { ...curr, dailyHours: nextDaily } },
    }));
  },

  removeProjectAllWeeks: (memberId, projectId) => {
    const prefix = `${memberId}:${projectId}:`;
    const map = { ...get().weekMap };
    for (const k of Object.keys(map)) {
      if (k.startsWith(prefix)) delete map[k];
    }
    set({ weekMap: map });
  },
}));

// Convenience non-hook access for imperative reads in render calculations
export const capacityStore = {
  getState: () => useCapacityStore.getState(),
};
