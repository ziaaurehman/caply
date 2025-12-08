import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/permissions - Get all available permissions
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get("x-organization-id") || "global";

    // Get all permissions grouped by module
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: "asc" },
        { action: "asc" },
      ],
    });

    // Group permissions by module
    const groupedPermissions = permissions.reduce(
      (acc: any, permission: any) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
      },
      {}
    );

    return NextResponse.json({ permissions: groupedPermissions });
  } catch (error) {
    console.error("Error in permissions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
