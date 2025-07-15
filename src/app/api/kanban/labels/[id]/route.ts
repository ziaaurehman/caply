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
  const labelId = params.id;
  const body = await req.json();
  const { name, color } = body;

  // Validate color format if provided
  if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
    return NextResponse.json({ error: 'Color must be a valid hex color (e.g., #FF0000)' }, { status: 400 });
  }

  // Check if user has access to the label
  const { data: existingLabel, error: labelError } = await supabase
    .from('labels')
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
    .eq('id', labelId)
    .eq('boards.projects.organization_members.user_id', session.user.id)
    .eq('boards.projects.organization_members.status', 'active')
    .single();

  if (labelError || !existingLabel) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  // Update label
  const { data: label, error } = await supabase
    .from('labels')
    .update({
      name,
      color
    })
    .eq('id', labelId)
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
      board_id: existingLabel.board_id,
      action_type: 'update',
      entity_type: 'label',
      entity_id: labelId,
      details: { changes: body }
    }]);

  return NextResponse.json({ label });
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
  const labelId = params.id;

  // Check if user has access to the label
  const { data: existingLabel, error: labelError } = await supabase
    .from('labels')
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
    .eq('id', labelId)
    .eq('boards.projects.organization_members.user_id', session.user.id)
    .eq('boards.projects.organization_members.status', 'active')
    .single();

  if (labelError || !existingLabel) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  // Delete label (CASCADE will handle card_labels)
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: existingLabel.board_id,
      action_type: 'delete',
      entity_type: 'label',
      entity_id: labelId,
      details: { label_name: existingLabel.name, label_color: existingLabel.color }
    }]);

  return NextResponse.json({ success: true });
}
