import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "Organization ID is required",
        },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "clients",
      action: "read",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const clients = await prisma.client.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = {
      clients: clients || [],
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/clients:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "Organization ID is required",
        },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "clients",
      action: "create",
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
    const {
      name,
      organizationId: bodyOrgId,
      email,
      phone,
      website,
      address,
      city,
      province,
      postal_code,
      postalCode,
      country,
      contact_person,
      contactPerson,
      notes,
      status,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        organizationId,
        name,
        createdBy: userContext!.userId,
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        address: address || undefined,
        city: city || undefined,
        province: province || undefined,
        postalCode: postalCode || postal_code || undefined,
        country: country || undefined,
        contactPerson: contactPerson || contact_person || undefined,
        notes: notes || undefined,
        status: status || "active",
      },
    });

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error("Error in POST /api/clients:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
