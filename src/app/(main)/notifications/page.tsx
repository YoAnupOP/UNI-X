'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Notification } from '@/lib/types'
import { Bell, Heart, MessageCircle, UserPlus, Calendar, Megaphone, Users, Sparkles, Check } from 'lucide-react'
import { getStaleCache, setCache, isCacheFresh } from '@/lib/cache'

const typeIcons: Record<string, typeof Heart> = {
    like: Heart, comment: MessageCircle, follow: UserPlus, match: Sparkles,
    event: Calendar, announcement: Megaphone, club: Users, message: MessageCircle,
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>(() => getStaleCache('notifications-data') || [])
    const [loading, setLoading] = useState(() => !getStaleCache('notifications-data'))
    const supabase = createClient()

    const fetch_ = useCallback(async (skipIfFresh = false) => {
        if (!user) { setLoading(false); return }
        if (skipIfFresh && isCacheFresh('notifications-data')) { setLoading(false); return }
        try {
            const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
            if (data) {
                setNotifications(data as Notification[])
                setCache('notifications-data', data)
            }
        } catch (e) {
            console.error('Failed to fetch notifications:', e)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!authLoading) fetch_(true)
    }, [fetch_, authLoading])

    // Real-time notifications: new notifications appear instantly
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel(`notifications-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const newNotif = payload.new as Notification
                    setNotifications(prev => {
                        if (prev.some(n => n.id === newNotif.id)) return prev
                        const updated = [newNotif, ...prev]
                        setCache('notifications-data', updated)
                        return updated
                    })
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    setNotifications(prev => {
                        const updated = prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } as Notification : n)
                        setCache('notifications-data', updated)
                        return updated
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    const markAllRead = async () => {
        if (!user) return
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
        setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    }

    return (
        <div style={{ maxWidth: '672px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: 0 }}>
                    Notifications
                </h1>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={markAllRead}
                        className="hover-lift"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '12px',
                            fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <Check size={16} /> Mark all read
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '20px' }} />
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '64px 20px', borderRadius: '24px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)',
                    }}>
                        <Bell size={32} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                        All caught up!
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                        No notifications right now
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map(n => {
                        const Icon = typeIcons[n.type] || Bell
                        return (
                            <div
                                key={n.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '20px', transition: 'all 0.2s',
                                    backgroundColor: n.is_read ? 'var(--color-bg-card)' : 'var(--color-primary-light)',
                                    border: `1px solid ${n.is_read ? 'var(--color-border)' : 'rgba(139,92,246,0.2)'}`,
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    if (n.is_read) {
                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (n.is_read) {
                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
                                    }
                                }}
                            >
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    backgroundColor: n.is_read ? 'var(--color-bg-elevated)' : 'rgba(139,92,246,0.1)',
                                    color: n.is_read ? 'var(--color-text-secondary)' : 'var(--color-primary)',
                                }}>
                                    <Icon size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                        <p style={{ fontSize: '15px', fontWeight: n.is_read ? 500 : 600, margin: '0 0 4px 0', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                                            {n.title}
                                        </p>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                            {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    {n.body && (
                                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {n.body}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
