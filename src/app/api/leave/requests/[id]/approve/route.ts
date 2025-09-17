import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
      action: "approve",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { context: userContext } = validation;
    const supabase = await createClient();

    const body = await request.json();
    const { status, comment, rejected_reason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (status === "rejected" && !rejected_reason) {
      return NextResponse.json(
        { error: "Rejection reason required" },
        { status: 400 }
      );
    }

    // Get the existing request
    const { data: existingRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", params.id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    // Update the request
    const updateData: any = {
      status,
      approved_by: userContext!.userId,
      approved_at: new Date().toISOString(),
    };

    if (comment) {
      updateData.approver_comment = comment;
    }

    if (status === "rejected" && rejected_reason) {
      updateData.rejected_reason = rejected_reason;
    }

    const { data: leaveRequest, error } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", params.id)
      .eq("organization_id", organizationId)
      .select(
        `
        id,
        organization_id,
        user_id,
        type,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        approved_by,
        approved_at,
        rejection_reason,
        created_at,
        updated_at,
        users:user_id ( id, full_name, email, avatar_url ),
        approver:approved_by ( id, full_name, email )
      `
      )
      .single();

    if (error) {
      console.error("Error updating leave request:", error);
      return NextResponse.json(
        { error: "Failed to update leave request" },
        { status: 500 }
      );
    }

    // Note: leave balances table not used; skipping balance updates

    return NextResponse.json({ leave_request: leaveRequest });
  } catch (error) {
    console.error("Leave request approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
