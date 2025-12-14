import { NextResponse } from 'next/server';
import { getOrganizations } from '@/lib/supabase-queries';

export async function GET() {
  try {
    const organizations = await getOrganizations();
    return NextResponse.json(organizations);
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: error.message },
      { status: 500 }
    );
  }
}
