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
  const commentId = params.id;
  const body = await req.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  // Check if user has access to the comment and is the author
  const { data: existingComment, error: commentError } = await supabase
    .from('comments')
    .select(`
      *,
      cards!inner (
        id,
        title,
        lists!inner (
          id,
          boards!inner (
            id,
            projects!inner (
              organization_members!inner (
                user_id
              )
            )
          )
        )
      )
    `)
    .eq('id', commentId)
    .eq('user_id', session.user.id) // Only the author can edit their comment
    .eq('cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (commentError || !existingComment) {
    return NextResponse.json({ error: 'Comment not found or you are not authorized to edit it' }, { status: 404 });
  }

  // Update comment
  const { data: comment, error } = await supabase
    .from('comments')
    .update({
      content
    })
    .eq('id', commentId)
    .select(`
      *,
      users (
        id,
        full_name,
        email,
        avatar_url
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
      user_id: session.user.id,
      board_id: (existingComment.cards as any).lists.boards.id,
      card_id: existingComment.card_id,
      action_type: 'update',
      entity_type: 'comment',
      entity_id: commentId,
      details: { 
        old_content: existingComment.content,
        new_content: content,
        card_title: (existingComment.cards as any).title
      }
    }]);

  return NextResponse.json({ comment });
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
  const commentId = params.id;

  // Check if user has access to the comment and is the author
  const { data: existingComment, error: commentError } = await supabase
    .from('comments')
    .select(`
      *,
      cards!inner (
        id,
        title,
        lists!inner (
          id,
          boards!inner (
            id,
            projects!inner (
              organization_members!inner (
                user_id
              )
            )
          )
        )
      )
    `)
    .eq('id', commentId)
    .eq('user_id', session.user.id) // Only the author can delete their comment
    .eq('cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (commentError || !existingComment) {
    return NextResponse.json({ error: 'Comment not found or you are not authorized to delete it' }, { status: 404 });
  }

  // Delete comment
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingComment.cards as any).lists.boards.id,
      card_id: existingComment.card_id,
      action_type: 'delete',
      entity_type: 'comment',
      entity_id: commentId,
      details: { 
        comment_content: existingComment.content,
        card_title: (existingComment.cards as any).title
      }
    }]);

  return NextResponse.json({ success: true });
}
