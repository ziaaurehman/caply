import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const notificationId = params.id;
  const body = await req.json();
  const { is_read } = body;

  // Check if user owns the notification
  const { data: existingNotification, error: notificationError } = await supabase
    .from('board_notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('user_id', session.user.id)
    .single();

  if (notificationError || !existingNotification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  // Update notification
  const { data: notification, error } = await supabase
    .from('board_notifications')
    .update({
      is_read
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const notificationId = params.id;

  // Check if user owns the notification
  const { data: existingNotification, error: notificationError } = await supabase
    .from('board_notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('user_id', session.user.id)
    .single();

  if (notificationError || !existingNotification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  // Delete notification
  const { error } = await supabase
    .from('board_notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
