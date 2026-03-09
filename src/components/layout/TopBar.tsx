'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'
import { Search, Bell, Sparkles } from 'lucide-react'

export default function TopBar() {
    const { profile } = useAuth()

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0 16px',
            backgroundColor: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-border)',
            overflow: 'hidden',
        }}>
            {/* Search */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                flex: 1,
                minWidth: 0,
                maxWidth: '400px',
            }}>
                <Search size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Search UNI-X..."
                    style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: '13px',
                        color: 'var(--color-text-primary)',
                        width: '100%',
                        fontFamily: 'var(--font-body)',
                    }}
                />
                <kbd style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'monospace',
                }}>⌘K</kbd>
            </div>

            {/* Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <Link href="/xplore-ai" title="XPLORE AI" style={{
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    transition: 'color 0.15s',
                }}>
                    <Sparkles size={18} />
                </Link>

                <Link href="/notifications" title="Notifications" style={{
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    position: 'relative',
                }}>
                    <Bell size={18} />
                </Link>

                <Link href={`/profile/${profile?.id || ''}`} style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: profile?.avatar_url
                        ? `url(${profile.avatar_url}) center/cover`
                        : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginLeft: '4px',
                }}>
                    {!profile?.avatar_url && (profile?.full_name?.[0] || 'U')}
                </Link>
            </div>
        </header>
    )
}
