import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: cardId } = await params;

  // Check user access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Check if user has access to the card
  const { data: card, error } = await supabase
    .from('cards')
    .select(`
      *,
      lists!inner (
        id,
        name,
        board_id,
        boards!inner (
          id,
          name,
          project_id,
          projects!inner (
            id,
            name,
            organization_id
          )
        )
      ),
      card_members (
        id,
        user_id,
        assigned_at,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      ),
      card_labels (
        id,
        label_id,
        labels (
          id,
          name,
          color
        )
      ),
      checklists (
        id,
        name,
        position,
        checklist_items (
          id,
          content,
          is_completed,
          position,
          due_date,
          assigned_to,
          users (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      ),
      comments (
        id,
        content,
        created_at,
        updated_at,
        user_id,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      ),
      attachments (
        id,
        filename,
        original_filename,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        uploaded_at,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .eq('id', cardId)
    .eq('lists.boards.projects.organization_id', userOrg.organization_id)
    .single();

  if (error || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  return NextResponse.json({ card });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: cardId } = await params;
  const body = await req.json();
  const { 
    title, 
    description, 
    list_id, 
    position, 
    due_date, 
    is_completed, 
    is_archived, 
    cover_color, 
    cover_image 
  } = body;

  // Check if user has access to the card
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify card exists and user has access through project organization
  const { data: existingCard, error: cardError } = await supabase
    .from('cards')
    .select(`
      *,
      lists!inner (
        id,
        board_id,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      )
    `)
    .eq('id', cardId)
    .eq('lists.boards.projects.organization_id', userOrg.organization_id)
    .single();

  if (cardError || !existingCard) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // If moving to a different list, verify access to target list
  if (list_id && list_id !== existingCard.list_id) {
    const { data: targetList, error: listError } = await supabase
      .from('lists')
      .select(`
        id,
        board_id,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      `)
      .eq('id', list_id)
      .eq('boards.projects.organization_id', userOrg.organization_id)
      .single();

    if (listError || !targetList) {
      return NextResponse.json({ error: 'Target list not found' }, { status: 404 });
    }
  }

  // Update card
  const { data: card, error } = await supabase
    .from('cards')
    .update({
      title,
      description,
      list_id,
      position,
      due_date,
      is_completed,
      is_archived,
      cover_color,
      cover_image
    })
    .eq('id', cardId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  let actionType = 'update';
  let details: any = { changes: body };

  if (list_id && list_id !== existingCard.list_id) {
    actionType = 'move';
    
    // Get list names for better activity description
    const { data: fromList } = await supabase
      .from('lists')
      .select('name')
      .eq('id', existingCard.list_id)
      .single();
      
    const { data: toList } = await supabase
      .from('lists')
      .select('name')
      .eq('id', list_id)
      .single();
    
    details = { 
      from_list_id: existingCard.list_id,
      from_list_name: fromList?.name || 'Unknown List',
      to_list_id: list_id,
      to_list_name: toList?.name || 'Unknown List',
      card_title: title || existingCard.title
    };
  }

  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingCard.lists as any).board_id,
      card_id: cardId,
      action_type: actionType,
      entity_type: 'card',
      entity_id: cardId,
      details
    }]);

  return NextResponse.json({ card });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: cardId } = await params;

  // Check user access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Check if user has access to the card
  const { data: existingCard, error: cardError } = await supabase
    .from('cards')
    .select(`
      *,
      lists!inner (
        id,
        board_id,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      )
    `)
    .eq('id', cardId)
    .eq('lists.boards.projects.organization_id', userOrg.organization_id)
    .single();

  if (cardError || !existingCard) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Delete card (CASCADE will handle related data)
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingCard.lists as any).board_id,
      card_id: cardId,
      action_type: 'delete',
      entity_type: 'card',
      entity_id: cardId,
      details: { card_title: existingCard.title }
    }]);

  return NextResponse.json({ success: true });
}
