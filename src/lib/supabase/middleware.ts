import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Skip Supabase auth if not configured yet
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here') {
        return supabaseResponse
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
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

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes - redirect to login if not authenticated
    const protectedPaths = ['/feed', '/profile', '/clubs', '/events', '/swipex', '/uniwall', '/messages', '/xplore-ai', '/admin', '/notifications', '/announcements', '/settings']
    const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    // Check if profile setup is completed (redirect incomplete profiles)
    // Uses a cookie to cache the result and avoid a DB query on every navigation
    const isSetupRoute = request.nextUrl.pathname === '/setup-profile'
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')

    if (user && !isSetupRoute && !isApiRoute && isProtectedRoute) {
        const profileCookie = request.cookies.get('profile_completed')?.value
        let profileCompleted: boolean | null = null

        if (profileCookie === 'true') {
            profileCompleted = true
        } else if (profileCookie === 'false') {
            profileCompleted = false
        } else {
            // Only query DB if cookie is missing
            const { data: profile } = await supabase
                .from('profiles')
                .select('profile_completed')
                .eq('id', user.id)
                .single()

            profileCompleted = profile?.profile_completed ?? null
            // Cache the result in a cookie (expires in 5 minutes)
            if (profile) {
                supabaseResponse.cookies.set('profile_completed', String(profile.profile_completed), {
                    maxAge: 300,
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                })
            }
        }

        if (profileCompleted === false) {
            const url = request.nextUrl.clone()
            url.pathname = '/setup-profile'
            return NextResponse.redirect(url)
        }
    }

    // Redirect logged-in users away from auth pages (except setup-profile)
    const authPaths = ['/login', '/signup']
    const isAuthRoute = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isAuthRoute && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/feed'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
