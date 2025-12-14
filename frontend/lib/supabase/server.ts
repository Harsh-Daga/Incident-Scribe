import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get current authenticated user and their organization
 * This is the SECURE way to get organization context
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Get user's organization from database
  const { data: userData, error: dbError } = await supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      organization_id,
      organizations:organization_id (
        id,
        name,
        slug
      )
    `)
    .eq('id', user.id)
    .single()

  if (dbError || !userData) {
    return null
  }

  const org = Array.isArray(userData.organizations)
    ? userData.organizations[0]
    : userData.organizations

  return {
    userId: userData.id,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    organizationId: userData.organization_id,
    organizationName: org?.name || 'Unknown',
    organizationSlug: org?.slug || 'unknown'
  }
}

/**
 * Get organization ID for current authenticated user
 * Returns null if not authenticated
 * This ensures users can ONLY access their own org's data
 */
export async function getAuthenticatedOrganizationId(): Promise<string | null> {
  const user = await getAuthenticatedUser()
  return user?.organizationId || null
}
