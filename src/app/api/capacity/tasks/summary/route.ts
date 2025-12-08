import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");
  const userId = searchParams.get("user_id");
  const projectId = searchParams.get("project_id");
  const projectIds = searchParams.getAll("project_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const includeTasks = searchParams.get("include_tasks") === "true";

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "projects",
    action: "read",
  });
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  // Build cache key
  const cacheKey = `capacity:tasks:summary:${organizationId}:${userId || "all"}:${projectId || "all"}:${projectIds.join(",") || "all"}:${startDate || "all"}:${endDate || "all"}:${includeTasks}`;

  try {
    // Build where clause for tasks within organization projects
    const where: any = {
      project: {
        organizationId,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }
    if (projectIds && projectIds.length > 0) {
      where.projectId = {
        in: projectIds,
      };
    }

    // If user filter provided, use assigned_to
    if (userId) {
      where.assignedTo = userId;
    }

    if (startDate) {
      where.dueDate = {
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.dueDate = {
        ...where.dueDate,
        lte: new Date(endDate),
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    });

    const byProject = new Map<
      string,
      {
        project_id: string;
        project_name?: string;
        tasks_count: number;
        estimated_hours: number;
        tasks?: Array<{
          id: string;
          title: string;
          estimated_hours?: number;
          due_date?: string;
        }>;
      }
    >();

    for (const t of tasks) {
      const key = t.projectId;
      if (!byProject.has(key)) {
        byProject.set(key, {
          project_id: t.projectId,
          project_name: t.project?.name,
          tasks_count: 0,
          estimated_hours: 0,
          tasks: includeTasks ? [] : undefined,
        });
      }
      const agg = byProject.get(key)!;
      agg.tasks_count += 1;
      agg.estimated_hours += Number(t.estimatedHours || 0);
      if (includeTasks) {
        (agg.tasks as any).push({
          id: t.id,
          title: t.title,
          estimated_hours: Number(t.estimatedHours || 0),
          due_date: t.dueDate,
        });
      }
    }

    const response = { summary: Array.from(byProject.values()) };

    return NextResponse.json(response);
  } catch (e) {
    console.error("Error in tasks summary route:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
