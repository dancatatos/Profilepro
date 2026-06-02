/**
 * Follow-up task count store — drives the badge on the Follow-Up nav
 * item and the "Today" card on the dashboard. One source of truth
 * fetched once on app mount; refresh()'d after key user actions so
 * the badge stays accurate without polling.
 *
 * Buckets mirror /pipelines/today's logic:
 *   - overdue: nextTaskAt < now
 *   - today:   nextTaskAt between now and end-of-day local
 *   - soon:    nextTaskAt within the 2-day horizon (after today)
 *
 * `total` is overdue + today (what the badge actually shows — "soon"
 * leads aren't urgent enough to flag with a red dot yet).
 */

import { create } from "zustand";
import { listLeadsWithUpcomingTasks } from "@/lib/firebase/firestore";

interface TaskCountState {
  overdue: number;
  today: number;
  soon: number;
  /** Sum of overdue + today — what the badge displays. */
  urgent: number;
  /** True only on the very first load — lets the UI distinguish "no
   *  data yet" from "loaded, zero tasks". */
  initialised: boolean;
  /** Fetch + recompute. Call after mark-complete, snooze, etc. */
  refresh: (ownerId: string) => Promise<void>;
  /** Reset on sign-out so the next user doesn't see stale numbers. */
  reset: () => void;
}

export const useTaskCountStore = create<TaskCountState>((set) => ({
  overdue: 0,
  today: 0,
  soon: 0,
  urgent: 0,
  initialised: false,

  refresh: async (ownerId: string) => {
    try {
      /* 2-day horizon covers overdue + today + soon in a single
         indexed query (existing composite index). Bucketing is
         cheap client-side over a max-200 list. */
      const leads = await listLeadsWithUpcomingTasks(ownerId, 2);
      const now = Date.now();
      const endOfToday = endOfTodayMs();

      let overdue = 0;
      let today = 0;
      let soon = 0;
      for (const lead of leads) {
        const t = lead.nextTaskAt;
        if (!t) continue;
        if (t < now) overdue += 1;
        else if (t <= endOfToday) today += 1;
        else soon += 1;
      }

      set({
        overdue,
        today,
        soon,
        urgent: overdue + today,
        initialised: true,
      });
    } catch {
      /* Silent — badge just won't show until next refresh. Not worth
         a toast for a passive UI indicator. */
      set({ initialised: true });
    }
  },

  reset: () =>
    set({
      overdue: 0,
      today: 0,
      soon: 0,
      urgent: 0,
      initialised: false,
    }),
}));

/* End-of-day in the user's LOCAL timezone — server-side computation
   would force a UTC midnight which mis-buckets PHT users by 8 hours. */
function endOfTodayMs(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
