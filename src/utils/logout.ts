import { signOut } from "next-auth/react";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";
import { useTimesheetsStore } from "@/lib/stores/timesheetsStore";

export const performLogout = async () => {
  try {
    // Clear all stores
    const { clearOrganizationData } = useOrganizationStore.getState();
    const { reset: resetSubscription } = useSubscriptionStore.getState();

    clearOrganizationData();
    resetSubscription();

    // Clear timesheets store
    const timesheetsStore = useTimesheetsStore.getState();
    useTimesheetsStore.setState({
      currentWeekStart: timesheetsStore.currentWeekStart,
      activeTab: "my-timesheet",
      currentTimesheet: null,
      submissions: [],
    });

    // Clear localStorage
    if (typeof window !== "undefined") {
      const keysToRemove = [
        "selectedOrganizationId",
        "timesheets-store",
        "subscription-store",
        "organization-store",
        "auth-store",
      ];

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();
    }

    // Sign out
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "/login";
  }
};
