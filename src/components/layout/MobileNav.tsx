'use client'

import PrefetchLink from '@/components/navigation/PrefetchLink'
import { usePathname } from 'next/navigation'
import { Home, Users, Repeat2, MessageCircle, Menu, X, Settings, LogOut, User, Calendar, Megaphone, Image as ImageIcon, Sparkles, Bell, Shield } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useState, useEffect, useRef } from 'react'

export default function MobileNav() {
    const pathname = usePathname()
    const { user, profile, signOut } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!menuOpen) return

        const handleClick = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [menuOpen])

    const navItems = [
        { href: '/feed', icon: Home, label: 'Feed' },
        { href: '/clubs', icon: Users, label: 'Clubs' },
        { href: '/swipex', icon: Repeat2, label: 'SwipeX', primary: true },
        { href: '/messages', icon: MessageCircle, label: 'Chats' },
    ]

    const menuLinks = [
        { href: user ? `/profile/${user.id}` : '/profile', icon: User, label: 'Profile' },
        { href: '/events', icon: Calendar, label: 'Events' },
        { href: '/announcements', icon: Megaphone, label: 'Announcements' },
        { href: '/uniwall', icon: ImageIcon, label: 'UniWall' },
        { href: '/xplore-ai', icon: Sparkles, label: 'XPLORE AI' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
        { href: '/settings', icon: Settings, label: 'Settings' },
        ...(profile?.role === 'admin' ? [{ href: '/admin', icon: Shield, label: 'Admin' }] : []),
    ]

    const closeMenu = () => setMenuOpen(false)

    return (
        <>
            {menuOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 39,
                    }}
                    onClick={closeMenu}
                />
            )}

            <div
                ref={menuRef}
                style={{
                    position: 'fixed',
                    bottom: menuOpen ? '64px' : '-100%',
                    left: 0,
                    right: 0,
                    zIndex: 41,
                    backgroundColor: 'var(--color-bg-card)',
                    borderTop: '1px solid var(--color-border)',
                    borderRadius: '20px 20px 0 0',
                    padding: '16px 8px',
                    paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
                    transition: 'bottom 0.25s ease',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                }}
            >
                {profile && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '8px 12px', marginBottom: '8px',
                        borderBottom: '1px solid var(--color-border)', paddingBottom: '16px',
                    }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: profile.avatar_url
                                ? `url(${profile.avatar_url}) center/cover`
                                : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                            color: 'white', fontSize: '15px', fontWeight: 700,
                        }}>
                            {!profile.avatar_url && (profile.full_name?.[0] || 'U')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '15px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.full_name || 'User'}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                                @{profile.username || 'username'}
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {menuLinks.map((item) => {
                        const Icon = item.icon
                        const active = pathname === item.href || pathname?.startsWith(item.href + '/')

                        return (
                            <PrefetchLink
                                key={item.href}
                                href={item.href}
                                onClick={closeMenu}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px', borderRadius: '12px',
                                    fontSize: '15px', fontWeight: active ? 600 : 400,
                                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                                }}
                            >
                                <Icon size={20} />
                                {item.label}
                            </PrefetchLink>
                        )
                    })}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px' }}>
                    <button
                        onClick={signOut}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px', borderRadius: '12px', width: '100%',
                            fontSize: '15px', fontWeight: 500,
                            color: 'var(--color-error)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </div>

            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 42,
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
                {navItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href || pathname?.startsWith(item.href + '/')

                    if (item.primary) {
                        return (
                            <PrefetchLink key={item.label} href={item.href} style={{
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
                            </PrefetchLink>
                        )
                    }

                    return (
                        <PrefetchLink key={item.label} href={item.href} style={{
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
                        </PrefetchLink>
                    )
                })}

                <button
                    onClick={() => setMenuOpen((current) => !current)}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '4px 8px',
                        color: menuOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontSize: '10px',
                        fontWeight: menuOpen ? 600 : 400,
                        transition: 'color 0.15s',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    <span>More</span>
                </button>
            </nav>
        </>
    )
}
