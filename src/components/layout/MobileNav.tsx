'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Repeat2, MessageCircle, User } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

export default function MobileNav() {
    const pathname = usePathname()
    const { user } = useAuth()

    const navItems = [
        { href: '/feed', icon: Home, label: 'Feed' },
        { href: '/clubs', icon: Users, label: 'Clubs' },
        { href: '/swipex', icon: Repeat2, label: 'SwipeX', primary: true },
        { href: '/messages', icon: MessageCircle, label: 'Chats' },
        { href: user ? `/profile/${user.id}` : '/profile', icon: User, label: 'Profile' },
    ]

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '64px',
            backgroundColor: 'rgba(9, 9, 11, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--color-border)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
            {navItems.map(item => {
                const Icon = item.icon
                const active = pathname === item.href || pathname?.startsWith(item.href + '/')

                if (item.primary) {
                    return (
                        <Link key={item.label} href={item.href} style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            color: 'white',
                            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.35)',
                            transform: 'translateY(-8px)',
                        }}>
                            <Icon size={22} />
                        </Link>
                    )
                }

                return (
                    <Link key={item.label} href={item.href} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '4px 8px',
                        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontSize: '10px',
                        fontWeight: active ? 600 : 400,
                        transition: 'color 0.15s',
                    }}>
                        <Icon size={20} />
                        <span>{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
