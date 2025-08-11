import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const commentId = params.id;
    const body = await req.json();
    const { content, organizationId } = body;
    const orgId = organizationId || req.headers.get('x-organization-id');

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // First, get the comment and verify ownership
    const { data: existingComment, error: commentError } = await supabase
      .from('comments')
      .select(`
        *,
        cards!inner (
          id,
          title,
          list_id,
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
        )
      `)
      .eq('id', commentId)
      .eq('user_id', session.user.id) // Only the author can edit their comment
      .single();

    if (commentError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found or you are not authorized to edit it' }, { status: 404 });
    }

    // Get organization ID from the comment's card
    const commentOrgId = (existingComment.cards as any).lists.boards.projects.organization_id;
    
    // If organizationId was provided, validate it matches
    if (orgId && orgId !== commentOrgId) {
      return NextResponse.json({ error: 'Organization ID mismatch' }, { status: 400 });
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(
      commentOrgId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
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
        board_id: (existingComment.cards as any).lists.board_id,
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
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const commentId = params.id;
    const organizationId = req.headers.get('x-organization-id');

    // First, get the comment and verify ownership
    const { data: existingComment, error: commentError } = await supabase
      .from('comments')
      .select(`
        *,
        cards!inner (
          id,
          title,
          list_id,
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
        )
      `)
      .eq('id', commentId)
      .eq('user_id', session.user.id) // Only the author can delete their comment
      .single();

    if (commentError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found or you are not authorized to delete it' }, { status: 404 });
    }

    // Get organization ID from the comment's card
    const commentOrgId = (existingComment.cards as any).lists.boards.projects.organization_id;
    
    // If organizationId was provided, validate it matches
    if (organizationId && organizationId !== commentOrgId) {
      return NextResponse.json({ error: 'Organization ID mismatch' }, { status: 400 });
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(
      commentOrgId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
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
        board_id: (existingComment.cards as any).lists.board_id,
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
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
