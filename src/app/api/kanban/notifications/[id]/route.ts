import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: notificationId } = await params;
  const body = await req.json();
  const { is_read } = body;

  // Check if user owns the notification
  const existingNotification = await prisma.boardNotification.findFirst({
    where: {
      id: notificationId,
      userId: session.user.id,
    },
  });

  if (!existingNotification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 }
    );
  }

  // Update notification
  const notification = await prisma.boardNotification.update({
    where: { id: notificationId },
    data: {
      isRead: is_read,
    },
  });

  return NextResponse.json({ notification });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: notificationId } = await params;

  // Check if user owns the notification
  const existingNotification = await prisma.boardNotification.findFirst({
    where: {
      id: notificationId,
      userId: session.user.id,
    },
  });

  if (!existingNotification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 }
    );
  }

  // Delete notification
  await prisma.boardNotification.delete({
    where: { id: notificationId },
  });

  return NextResponse.json({ success: true });
}
