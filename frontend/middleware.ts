import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/signup', '/auth/callback']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path)
  
  // Setup paths require platform admin
  const isSetupPath = request.nextUrl.pathname === '/setup' || request.nextUrl.pathname.startsWith('/setup/')

  // Webhook paths (authenticated via webhook key, not user session)
  const webhookPaths = ['/api/webhooks']
  const isWebhookPath = webhookPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Setup API paths (can be accessed for initial setup)
  const setupApiPaths = ['/api/setup']
  const isSetupApiPath = setupApiPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Allow webhook and setup API paths without authentication
  if (isWebhookPath || isSetupApiPath) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  if (user && (request.nextUrl.pathname.startsWith('/dashboard/admin') || isSetupPath)) {
    // Check if user is platform admin
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_platform_admin')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Middleware: Error fetching user for admin check:', error.message)
        // Allow access to dashboard, let the page handle the error
        if (isSetupPath) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      } else if (!userData?.is_platform_admin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (err) {
      console.error('Middleware: Exception checking admin status:', err)
    }
  }
  
  // Redirect to login if trying to access setup without being authenticated
  if (!user && isSetupPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith('/dashboard/organization')) {
    // Check if user is org admin
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Middleware: Error fetching user for org check:', error.message)
        // Fail closed: redirect on DB error for security
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      } else if (userData?.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (err) {
      console.error('Middleware: Exception checking org admin status:', err)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
