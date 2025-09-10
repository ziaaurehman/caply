"use client";

import type React from "react";

import { useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useSession } from "next-auth/react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const { handleInvitationAccepted, clearOrganizationData } =
    useOrganizationStore();

  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("User not authenticated, clearing organization data");
      clearOrganizationData();
    }
  }, [status, clearOrganizationData]);

  // Listen for invitation acceptance events
  useEffect(() => {
    const handleInvitationAcceptedEvent = (event: CustomEvent) => {
      const { organizationId } = event.detail;
      console.log("Invitation accepted event received:", organizationId);
      if (organizationId) {
        handleInvitationAccepted(organizationId);
      }
    };

    // Add event listener
    window.addEventListener(
      "invitation-accepted",
      handleInvitationAcceptedEvent as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "invitation-accepted",
        handleInvitationAcceptedEvent as EventListener
      );
    };
  }, [handleInvitationAccepted]);

  return <DashboardLayout>{children}</DashboardLayout>;
}
