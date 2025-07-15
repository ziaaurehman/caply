import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const listId = params.id;

  // Check if user has access to the list
  const { data: list, error } = await supabase
    .from('lists')
    .select(`
      *,
      boards!inner (
        id,
        projects!inner (
          organization_members!inner (
            user_id
          )
        )
      )
    `)
    .eq('id', listId)
    .eq('boards.projects.organization_members.user_id', session.user.id)
    .eq('boards.projects.organization_members.status', 'active')
    .single();

  if (error || !list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  return NextResponse.json({ list });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const listId = params.id;
  const body = await req.json();
  const { name, position, is_archived } = body;

  // Check if user has access to the list
  const { data: existingList, error: listError } = await supabase
    .from('lists')
    .select(`
      *,
      boards!inner (
        id,
        projects!inner (
          organization_members!inner (
            user_id
          )
        )
      )
    `)
    .eq('id', listId)
    .eq('boards.projects.organization_members.user_id', session.user.id)
    .eq('boards.projects.organization_members.status', 'active')
    .single();

  if (listError || !existingList) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  // Update list
  const { data: list, error } = await supabase
    .from('lists')
    .update({
      name,
      position,
      is_archived
    })
    .eq('id', listId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: existingList.board_id,
      action_type: 'update',
      entity_type: 'list',
      entity_id: listId,
      details: { changes: body }
    }]);

  return NextResponse.json({ list });
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
  const listId = params.id;

  // Check if user has access to the list
  const { data: existingList, error: listError } = await supabase
    .from('lists')
    .select(`
      *,
      boards!inner (
        id,
        projects!inner (
          organization_members!inner (
            user_id
          )
        )
      )
    `)
    .eq('id', listId)
    .eq('boards.projects.organization_members.user_id', session.user.id)
    .eq('boards.projects.organization_members.status', 'active')
    .single();

  if (listError || !existingList) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  // Delete list (CASCADE will handle related cards)
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: existingList.board_id,
      action_type: 'delete',
      entity_type: 'list',
      entity_id: listId,
      details: { list_name: existingList.name }
    }]);

  return NextResponse.json({ success: true });
}
