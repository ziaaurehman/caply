import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get("x-organization-id");

  // Prefer header-based org validation for consistency
  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "capacity",
    action: "read",
  });
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const allocation = await prisma.projectAssignment.findFirst({
      where: {
        id: allocationId,
        resourceAllocation: {
          organizationId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
        resourceAllocation: {
          include: {
            organizationMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!allocation) {
      return NextResponse.json(
        { error: "Resource allocation not found" },
        { status: 404 }
      );
    }

    // Transform to match expected format
    const transformedAllocation = {
      id: allocation.id,
      project_id: allocation.projectId,
      hours_per_week: Number(allocation.hoursPerWeek),
      start_date: allocation.startDate,
      end_date: allocation.endDate,
      notes: allocation.notes,
      default_hours_per_day: Number(allocation.defaultHoursPerDay),
      allow_weekends: allocation.allowWeekends,
      is_active: allocation.isActive,
      resource_allocation_id: allocation.resourceAllocationId,
      created_at: allocation.createdAt,
      updated_at: allocation.updatedAt,
      projects: allocation.project
        ? {
            id: allocation.project.id,
            name: allocation.project.name,
            code: allocation.project.code,
            status: allocation.project.status,
          }
        : null,
      resource_allocations: allocation.resourceAllocation
        ? {
            id: allocation.resourceAllocation.id,
            organization_id: allocation.resourceAllocation.organizationId,
            organization_member_id:
              allocation.resourceAllocation.organizationMemberId,
            organization_members: allocation.resourceAllocation
              .organizationMember
              ? {
                  id: allocation.resourceAllocation.organizationMember.id,
                  user_id:
                    allocation.resourceAllocation.organizationMember.userId,
                  users: allocation.resourceAllocation.organizationMember.user
                    ? {
                        id: allocation.resourceAllocation.organizationMember
                          .user.id,
                        full_name:
                          allocation.resourceAllocation.organizationMember.user
                            .fullName,
                        email:
                          allocation.resourceAllocation.organizationMember.user
                            .email,
                        avatar_url:
                          allocation.resourceAllocation.organizationMember.user
                            .avatarUrl,
                      }
                    : null,
                }
              : null,
          }
        : null,
    };

    const response = { allocation: transformedAllocation };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching resource allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get("x-organization-id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { hours_per_week, start_date, end_date, notes, is_active } = body;

    // Verify assignment belongs to same organization
    const currentAllocation = await prisma.projectAssignment.findFirst({
      where: {
        id: allocationId,
        resourceAllocation: {
          organizationId,
        },
      },
      include: {
        resourceAllocation: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!currentAllocation) {
      return NextResponse.json(
        { error: "Resource allocation not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (hours_per_week !== undefined)
      updateData.hoursPerWeek = Number(hours_per_week);
    if (start_date !== undefined) {
      updateData.startDate = new Date(start_date);
    }
    if (end_date !== undefined) {
      updateData.endDate = end_date ? new Date(end_date) : null;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (is_active !== undefined) {
      updateData.isActive = is_active;
    }
    updateData.updatedAt = new Date();

    // Update the assignment
    const allocation = await prisma.projectAssignment.update({
      where: { id: allocationId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
        resourceAllocation: {
          include: {
            organizationMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Transform to match expected format
    const transformedAllocation = {
      id: allocation.id,
      project_id: allocation.projectId,
      hours_per_week: Number(allocation.hoursPerWeek),
      start_date: allocation.startDate,
      end_date: allocation.endDate,
      notes: allocation.notes,
      default_hours_per_day: Number(allocation.defaultHoursPerDay),
      allow_weekends: allocation.allowWeekends,
      is_active: allocation.isActive,
      resource_allocation_id: allocation.resourceAllocationId,
      created_at: allocation.createdAt,
      updated_at: allocation.updatedAt,
      projects: allocation.project
        ? {
            id: allocation.project.id,
            name: allocation.project.name,
            code: allocation.project.code,
            status: allocation.project.status,
          }
        : null,
      resource_allocations: allocation.resourceAllocation
        ? {
            id: allocation.resourceAllocation.id,
            organization_member_id:
              allocation.resourceAllocation.organizationMemberId,
            organization_members: allocation.resourceAllocation
              .organizationMember
              ? {
                  id: allocation.resourceAllocation.organizationMember.id,
                  users: allocation.resourceAllocation.organizationMember.user
                    ? {
                        id: allocation.resourceAllocation.organizationMember
                          .user.id,
                        full_name:
                          allocation.resourceAllocation.organizationMember.user
                            .fullName,
                        email:
                          allocation.resourceAllocation.organizationMember.user
                            .email,
                        avatar_url:
                          allocation.resourceAllocation.organizationMember.user
                            .avatarUrl,
                      }
                    : null,
                }
              : null,
          }
        : null,
    };

    return NextResponse.json({ allocation: transformedAllocation });
  } catch (error: any) {
    console.error("Error updating resource allocation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get("x-organization-id");

  console.log(
    "DELETE request for allocation:",
    allocationId,
    "organization:",
    organizationId
  );

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  try {
    // Verify assignment exists and belongs to user's organization
    const allocation = await prisma.projectAssignment.findFirst({
      where: {
        id: allocationId,
        resourceAllocation: {
          organizationId,
        },
      },
      include: {
        resourceAllocation: {
          select: {
            id: true,
            organizationId: true,
            organizationMemberId: true,
          },
        },
      },
    });

    console.log("Found allocation:", allocation);

    if (!allocation) {
      console.log("Allocation not found");
      return NextResponse.json(
        { error: "Project assignment not found" },
        { status: 404 }
      );
    }

    console.log("Performing hard delete for allocation:", allocationId);

    try {
      // Hard delete the project assignment record
      await prisma.projectAssignment.delete({
        where: { id: allocationId },
      });

      console.log("Hard delete successful for allocation:", allocationId);
      return NextResponse.json({
        message: "Resource allocation deleted successfully",
      });
    } catch (deleteError: any) {
      console.error("Delete failed:", deleteError);

      // If deletion fails due to foreign key constraints, try soft delete as fallback
      if (
        deleteError.message?.includes("foreign key") ||
        deleteError.message?.includes("constraint")
      ) {
        console.log("Trying soft delete as fallback...");

        await prisma.projectAssignment.update({
          where: { id: allocationId },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });

        console.log("Soft delete successful as fallback");
        return NextResponse.json({
          message: "Resource allocation deactivated successfully (soft delete)",
        });
      }

      throw deleteError;
    }
  } catch (error: any) {
    console.error("Error deleting resource allocation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
