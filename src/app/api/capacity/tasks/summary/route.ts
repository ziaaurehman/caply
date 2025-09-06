import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis';

// Cache TTL: 1 hour (task summaries change moderately)
const CACHE_TTL = 3600; // 1 hour

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');
  const userId = searchParams.get('user_id');
  const projectId = searchParams.get('project_id');
  const projectIds = searchParams.getAll('project_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const includeTasks = searchParams.get('include_tasks') === 'true';

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'read' }
  );
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  // Build cache key
  const cacheKey = `capacity:tasks:summary:${organizationId}:${userId || 'all'}:${projectId || 'all'}:${projectIds.join(',') || 'all'}:${startDate || 'all'}:${endDate || 'all'}:${includeTasks}`;

  try {
    // Try to get from cache first
    const cachedData = await redisGetJSON(cacheKey);
    if (cachedData) {
      console.log('Cache hit for capacity tasks summary:', cacheKey);
      return NextResponse.json(cachedData);
    }

    const supabase = await createClient();

    // Build base query for tasks within organization projects
    let tasksQuery = supabase
      .from('tasks')
      .select(`id, project_id, title, estimated_hours, due_date, projects!inner ( id, name, organization_id )`)
      .eq('projects.organization_id', organizationId);

    if (projectId) tasksQuery = tasksQuery.eq('project_id', projectId);
    if (projectIds && projectIds.length > 0) tasksQuery = tasksQuery.in('project_id', projectIds);

    // If user filter provided, join via organization_members/project_members mapping using time_entries or assignments if available
    // As we do not have direct assignment linkage except tasks.assigned_to (users.id), use that
    if (userId) tasksQuery = tasksQuery.eq('assigned_to', userId);

    if (startDate) tasksQuery = tasksQuery.gte('due_date', startDate);
    if (endDate) tasksQuery = tasksQuery.lte('due_date', endDate);

    const { data: tasks, error } = await tasksQuery;
    if (error) {
      console.error('Error fetching tasks summary:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byProject = new Map<string, {
      project_id: string;
      project_name?: string;
      tasks_count: number;
      estimated_hours: number;
      tasks?: Array<{ id: string; title: string; estimated_hours?: number; due_date?: string }>
    }>();

    for (const t of tasks || []) {
      const key = t.project_id;
      if (!byProject.has(key)) {
        byProject.set(key, {
          project_id: t.project_id,
          project_name: (t as any).projects?.name,
          tasks_count: 0,
          estimated_hours: 0,
          tasks: includeTasks ? [] : undefined,
        });
      }
      const agg = byProject.get(key)!;
      agg.tasks_count += 1;
      agg.estimated_hours += Number(t.estimated_hours || 0);
      if (includeTasks) {
        (agg.tasks as any).push({ id: t.id, title: t.title, estimated_hours: t.estimated_hours || 0, due_date: t.due_date });
      }
    }

    const response = { summary: Array.from(byProject.values()) };

    // Cache the response
    await redisSetJSON(cacheKey, response, CACHE_TTL);
    console.log('Cached capacity tasks summary:', cacheKey);

    return NextResponse.json(response);
  } catch (e) {
    console.error('Error in tasks summary route:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


