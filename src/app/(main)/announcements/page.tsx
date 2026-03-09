'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Announcement } from '@/lib/types'
import { Megaphone, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { getStaleCache, setCache, isCacheFresh } from '@/lib/cache'

const priorityConfig = {
    urgent: { color: '#F87171', bg: 'rgba(248,113,113,0.1)', icon: AlertTriangle, label: 'Urgent' },
    high: { color: '#FB923C', bg: 'rgba(251,146,60,0.1)', icon: AlertCircle, label: 'Important' },
    normal: { color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', icon: Info, label: 'Info' },
    low: { color: '#71717A', bg: 'rgba(113,113,122,0.1)', icon: Megaphone, label: 'Notice' },
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStaleCache('announcements-data') || [])
    const [loading, setLoading] = useState(() => !getStaleCache('announcements-data'))
    const supabase = createClient()

    const fetch_ = useCallback(async (skipIfFresh = false) => {
        if (skipIfFresh && isCacheFresh('announcements-data')) { setLoading(false); return }
        try {
            const { data } = await supabase.from('announcements').select('*, author:profiles(*)').eq('is_active', true).order('created_at', { ascending: false })
            if (data) {
                setAnnouncements(data as Announcement[])
                setCache('announcements-data', data)
            }
        } catch (e) {
            console.error('Failed to fetch announcements:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetch_(true) }, [fetch_])

    return (
        <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h1 className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: 0 }}>
                Announcements
            </h1>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '24px' }} />
                    ))}
                </div>
            ) : announcements.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '64px 20px', borderRadius: '24px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)',
                    }}>
                        <Megaphone size={32} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                        No announcements
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                        Check back later!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {announcements.map(a => {
                        const config = priorityConfig[a.priority as keyof typeof priorityConfig] || priorityConfig.normal
                        const Icon = config.icon
                        return (
                            <div key={a.id} className="hover-lift" style={{
                                borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', transition: 'all 0.2s',
                                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                borderLeft: `4px solid ${config.color}`, cursor: 'default',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    backgroundColor: config.bg, color: config.color,
                                }}>
                                    <Icon size={24} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '99px',
                                            backgroundColor: config.bg, color: config.color, letterSpacing: '0.05em'
                                        }}>
                                            {config.label}
                                        </span>
                                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                            {new Date(a.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
                                        {a.title}
                                    </h3>
                                    <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {a.content}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
