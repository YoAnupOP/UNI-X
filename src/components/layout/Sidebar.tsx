'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Users,
    Calendar,
    Megaphone,
    Repeat2,
    Image as ImageIcon,
    MessageCircle,
    Sparkles,
    Bell,
    Settings,
    LogOut,
    Shield,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
    { href: '/feed', label: 'Feed', icon: Home },
    { href: '/clubs', label: 'Clubs', icon: Users },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/announcements', label: 'News', icon: Megaphone },
    { href: '/swipex', label: 'SwipeX', icon: Repeat2 },
    { href: '/uniwall', label: 'UniWall', icon: ImageIcon },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/xplore-ai', label: 'XPLORE AI', icon: Sparkles },
]

export default function Sidebar() {
    const { profile, signOut } = useAuth()
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    const isActive = (href: string) => pathname === href

    return (
        <aside style={{
            width: collapsed ? '72px' : '240px',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRight: '1px solid var(--color-border)',
            transition: 'width 0.2s ease',
            zIndex: 40,
            overflow: 'hidden',
        }}>
            {/* Logo */}
            <div style={{
                padding: collapsed ? '20px 16px' : '20px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                borderBottom: '1px solid var(--color-border)',
                minHeight: '64px',
            }}>
                <Link href="/feed" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        color: 'white', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-display)',
                        flexShrink: 0,
                    }}>X</div>
                    {!collapsed && (
                        <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                            UNI-X
                        </span>
                    )}
                </Link>
                {!collapsed && (
                    <button onClick={() => setCollapsed(true)} style={{
                        padding: '4px', borderRadius: '6px', color: 'var(--color-text-muted)',
                        cursor: 'pointer', background: 'none', border: 'none',
                    }}>
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Collapse expand button */}
            {collapsed && (
                <button onClick={() => setCollapsed(false)} style={{
                    padding: '8px', margin: '8px auto', borderRadius: '8px', color: 'var(--color-text-muted)',
                    cursor: 'pointer', background: 'none', border: 'none',
                }}>
                    <ChevronRight size={16} />
                </button>
            )}

            {/* Navigation */}
            <nav style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {navItems.map(item => {
                        const Icon = item.icon
                        const active = isActive(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: collapsed ? '10px 0' : '10px 12px',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                                    transition: 'all 0.15s ease',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    position: 'relative',
                                }}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon size={18} style={{ flexShrink: 0 }} />
                                {!collapsed && item.label}
                                {item.label === 'XPLORE AI' && !collapsed && (
                                    <span style={{
                                        marginLeft: 'auto', padding: '2px 6px', borderRadius: '6px',
                                        fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        color: 'white',
                                    }}>AI</span>
                                )}
                            </Link>
                        )
                    })}

                    {/* Admin link (only for admin users) */}
                    {profile?.role === 'admin' && (
                        <Link
                            href="/admin"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: collapsed ? '10px 0' : '10px 12px', borderRadius: '10px',
                                fontSize: '14px', color: isActive('/admin') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                backgroundColor: isActive('/admin') ? 'var(--color-primary-light)' : 'transparent',
                                justifyContent: collapsed ? 'center' : 'flex-start', marginTop: '8px',
                                borderTop: '1px solid var(--color-border)', paddingTop: '16px',
                            }}
                        >
                            <Shield size={18} style={{ flexShrink: 0 }} />
                            {!collapsed && 'Admin'}
                        </Link>
                    )}
                </div>
            </nav>

            {/* Bottom Section */}
            <div style={{ padding: '8px', borderTop: '1px solid var(--color-border)' }}>
                <Link href="/notifications" style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: collapsed ? '10px 0' : '10px 12px', borderRadius: '10px',
                    fontSize: '14px', color: 'var(--color-text-secondary)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                    <Bell size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && 'Notifications'}
                </Link>

                <Link href="/settings" style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: collapsed ? '10px 0' : '10px 12px', borderRadius: '10px',
                    fontSize: '14px', color: 'var(--color-text-secondary)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                    <Settings size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && 'Settings'}
                </Link>

                {/* Profile */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: collapsed ? '10px 0' : '10px 12px', marginTop: '4px',
                    borderTop: '1px solid var(--color-border)', paddingTop: '12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: profile?.avatar_url
                            ? `url(${profile.avatar_url}) center/cover`
                            : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                        color: 'white', fontSize: '13px', fontWeight: 700,
                    }}>
                        {!profile?.avatar_url && (profile?.full_name?.[0] || 'U')}
                    </div>
                    {!collapsed && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile?.full_name || 'User'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                @{profile?.username || 'username'}
                            </p>
                        </div>
                    )}
                    <button onClick={signOut} title="Sign out" style={{
                        padding: '6px', borderRadius: '8px', color: 'var(--color-text-muted)',
                        cursor: 'pointer', background: 'none', border: 'none',
                    }}>
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </aside>
    )
}
