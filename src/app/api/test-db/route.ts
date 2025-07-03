import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('Testing database connection...');

    // Test 1: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Auth user result:', { user, userError });

    // Test 2: Try to get user profile from users table
    let users = null;
    let usersError = null;
    
    if (user) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      users = data;
      usersError = error;
    }
    
    console.log('Users query result:', { users, usersError });

    // Test 3: Try to get organizations table structure  
    const { data: organizations, error: organizationsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    console.log('Organizations query result:', { organizations, organizationsError });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        auth: { user, error: userError },
        users: { data: users, error: usersError },
        organizations: { data: organizations, error: organizationsError }
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 