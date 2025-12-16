import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// GET /api/invoices?organizationId=...&invoiceId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");
    const invoiceId = searchParams.get("invoiceId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate access
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "invoices",
      action: "read",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    if (invoiceId) {
      // Get single invoice
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId },
        include: { lineItems: true, client: true, project: true },
      });
      if (!invoice) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ invoice });
    } else {
      // Get all invoices for organization
      const invoices = await prisma.invoice.findMany({
        where: { organizationId },
        include: { lineItems: true, client: true, project: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ invoices });
    }
  } catch (error: any) {
    console.error("Error in GET /api/invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const organizationId =
      body.organizationId || req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate access
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "invoices",
      action: "create",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { context: userContext } = validation;
    const {
      clientId,
      projectId,
      invoiceNumber,
      companyName,
      companyAddress,
      companyPhone,
      title,
      description,
      subtotal,
      discountAmount,
      discountPercentage,
      province,
      isInternational,
      paymentMethod,
      discounttype,
      taxAmount,
      totalAmount,
      currency,
      issueDate,
      dueDate,
      status,
      poNumber,
      notes,
      lineItems,
    } = body;

    if (!clientId || !invoiceNumber || !title || !issueDate || !dueDate) {
      return NextResponse.json(
        {
          error:
            "Required fields missing (clientId, invoiceNumber, title, issueDate, dueDate)",
        },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        clientId,
        projectId: projectId || undefined,
        invoiceNumber,
        companyName,
        companyAddress,
        province,
        paymentMethod,
        isInternational,
        discounttype,
        companyPhone,
        title,
        description,
        subtotal: subtotal || 0,
        discountAmount: discountAmount || 0,
        discountPercentage: discountPercentage || 0,
        taxAmount: taxAmount || 0,
        totalAmount: totalAmount || 0,
        currency: currency || "CAD",
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status: status || "draft",
        poNumber: poNumber || undefined,
        notes: notes || undefined,
        createdBy: userContext!.userId,
        lineItems: lineItems
          ? {
              create: lineItems.map((item: any, idx: number) => ({
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice,
                amount: item.amount,
                position: idx,
              })),
            }
          : undefined,
      },
      include: { lineItems: true },
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Error in POST /api/invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const organizationId =
      body.organizationId || req.headers.get("x-organization-id");
    const invoiceId = body.id;

    if (!organizationId || !invoiceId) {
      return NextResponse.json(
        { error: "Organization ID and Invoice ID required" },
        { status: 400 }
      );
    }

    // Validate access
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "invoices",
      action: "update",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const {
      clientId,
      projectId,
      title,
      description,
      companyName,
      companyAddress,
      companyPhone,
      subtotal,
      discountAmount,
      discountPercentage,
      paymentMethod,
      taxAmount,
      totalAmount,
      province,
      isInternational,
      discounttype,
      currency,
      issueDate,
      dueDate,
      status,
      poNumber,
      notes,
      lineItems,
    } = body;

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        clientId,
        projectId,
        title,
        companyName,
        paymentMethod,
        companyAddress,
        companyPhone,
        description,
        province,
        isInternational,
        discounttype,
        subtotal,
        discountAmount,
        discountPercentage,
        taxAmount,
        totalAmount,
        currency,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        poNumber,
        notes,
        lineItems: lineItems
          ? {
              deleteMany: {}, // remove old line items
              create: lineItems.map((item: any, idx: number) => ({
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice,
                amount: item.amount,
                position: idx,
              })),
            }
          : undefined,
      },
      include: { lineItems: true },
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error: any) {
    console.error("Error in PUT /api/invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices?invoiceId=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");
    const invoiceId = searchParams.get("invoiceId");

    if (!organizationId || !invoiceId) {
      return NextResponse.json(
        { error: "Organization ID and Invoice ID required" },
        { status: 400 }
      );
    }

    // Validate access
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "invoices",
      action: "delete",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error: any) {
    console.error("Error in DELETE /api/invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
