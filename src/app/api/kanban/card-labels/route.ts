import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { card_id, label_id } = body;
  const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

  if (!card_id || !label_id) {
    return NextResponse.json({ error: 'Card ID and Label ID are required' }, { status: 400 });
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'update' }
  );

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status });
  }

  // Check if card exists within the organization
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select(`
      id,
      title,
      lists!inner (
        id,
        boards!inner (
          id,
          projects!inner (
            organization_id
          )
        )
      )
    `)
    .eq('id', card_id)
    .eq('lists.boards.projects.organization_id', organizationId)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Verify the label belongs to the same board
  const boardId = (card.lists as any).boards.id;
  const { data: label, error: labelError } = await supabase
    .from('labels')
    .select('id, name, color')
    .eq('id', label_id)
    .eq('board_id', boardId)
    .single();

  if (labelError || !label) {
    return NextResponse.json({ error: 'Label not found on this board' }, { status: 404 });
  }

  // Check if label is already assigned to the card
  const { data: existingCardLabel } = await supabase
    .from('card_labels')
    .select('id')
    .eq('card_id', card_id)
    .eq('label_id', label_id)
    .single();

  if (existingCardLabel) {
    return NextResponse.json({ error: 'Label is already assigned to this card' }, { status: 400 });
  }

  // Assign label to card
  const { data: cardLabel, error } = await supabase
    .from('card_labels')
    .insert([{
      card_id,
      label_id
    }])
    .select(`
      *,
      labels (
        id,
        name,
        color
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: validation.context!.userId,
      board_id: boardId,
      card_id: card_id,
      action_type: 'create',
      entity_type: 'card_label',
      entity_id: cardLabel.id,
      details: { 
        label_name: label.name,
        label_color: label.color,
        card_title: card.title 
      }
    }]);

  return NextResponse.json({ card_label: cardLabel });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get('card_id');
  const labelId = searchParams.get('label_id');
  const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

  if (!cardId || !labelId) {
    return NextResponse.json({ error: 'Card ID and Label ID are required' }, { status: 400 });
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'update' }
  );

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status });
  }

  // Check if card exists within the organization
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select(`
      id,
      title,
      lists!inner (
        id,
        boards!inner (
          id,
          projects!inner (
            organization_id
          )
        )
      )
    `)
    .eq('id', cardId)
    .eq('lists.boards.projects.organization_id', organizationId)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Get the card label to delete
  const { data: cardLabel, error: cardLabelError } = await supabase
    .from('card_labels')
    .select(`
      id,
      labels (
        id,
        name,
        color
      )
    `)
    .eq('card_id', cardId)
    .eq('label_id', labelId)
    .single();

  if (cardLabelError || !cardLabel) {
    return NextResponse.json({ error: 'Card label not found' }, { status: 404 });
  }

  // Remove label from card
  const { error } = await supabase
    .from('card_labels')
    .delete()
    .eq('card_id', cardId)
    .eq('label_id', labelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: validation.context!.userId,
      board_id: (card.lists as any).boards.id,
      card_id: cardId,
      action_type: 'delete',
      entity_type: 'card_label',
      entity_id: cardLabel.id,
      details: { 
        label_name: (cardLabel.labels as any).name,
        label_color: (cardLabel.labels as any).color,
        card_title: card.title 
      }
    }]);

  return NextResponse.json({ success: true });
}
